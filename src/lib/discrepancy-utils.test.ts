import { describe, expect, it } from "vitest";
import {
  DISCREPANCY_NUMERIC_EPSILON,
  filterContractHits,
  filterGasHits,
  hasElectricityHits,
  hasGasHits,
  isGasOvercharged,
  isTruthyDetected,
  pickGasSummary,
  type DiscrepancyRow,
  type ElectricityContractRow,
} from "./discrepancy-utils";

const baseGasRow = (overrides: Partial<DiscrepancyRow> = {}): DiscrepancyRow => ({
  discrepancy_type: "gas",
  utility_identifier: "MRIN123",
  linked_business_name: "Test Co",
  invoice_period: "01/01/2024 - 31/01/2024",
  invoice_rate: "10",
  contract_period: "01/01/2024 - 31/12/2024",
  contract_rate: "9",
  rate_difference: "0",
  pct_difference: "0",
  annual_quantity_gj: "100",
  annual_potential_overcharge: "0",
  take_or_pay_invoice: "",
  ...overrides,
});

const baseContractRow = (
  overrides: Partial<ElectricityContractRow> = {}
): ElectricityContractRow => ({
  discrepancy_type: "electricity_contract",
  utility_identifier: "NMI123",
  linked_business_name: "Test Co",
  retailer: "Retailer",
  site_address: "1 Test St",
  invoice_period: "01/01/2024 - 31/01/2024",
  contract_period: "01/01/2024 - 31/12/2024",
  peak_quantity_kwh: "1000",
  peak_contract_rate: "0.10",
  peak_invoice_rate: "0.11",
  peak_rate_difference: "0",
  peak_pct_difference: "0",
  shoulder_quantity_kwh: "0",
  shoulder_contract_rate: "0",
  shoulder_invoice_rate: "0",
  shoulder_rate_difference: "0",
  shoulder_pct_difference: "0",
  off_peak_quantity_kwh: "0",
  off_peak_contract_rate: "0",
  off_peak_invoice_rate: "0",
  off_peak_rate_difference: "0",
  off_peak_pct_difference: "0",
  service_charge_contract: "0",
  service_charge_invoice: "0",
  service_charge_difference: "0",
  service_charge_pct_difference: "0",
  contract_target_consumption_kwh: "0",
  discrepancy_detected: "FALSE",
  notes: "",
  ...overrides,
});

describe("discrepancy-utils", () => {
  it("exports a shared numeric epsilon threshold", () => {
    expect(DISCREPANCY_NUMERIC_EPSILON).toBe(0.001);
  });

  it("treats all-false electricity rows as no hits", () => {
    const rows = Array.from({ length: 24 }, (_, i) =>
      baseContractRow({
        utility_identifier: "NMI123",
        invoice_period: `01/${String(i + 1).padStart(2, "0")}/2024 - 28/${String(i + 1).padStart(2, "0")}/2024`,
        discrepancy_detected: "FALSE",
      })
    );
    expect(filterContractHits(rows)).toHaveLength(0);
    expect(hasElectricityHits(rows, [])).toBe(false);
  });

  it("detects a buried electricity contract hit among falses", () => {
    const rows = [
      ...Array.from({ length: 24 }, () =>
        baseContractRow({ discrepancy_detected: "FALSE" })
      ),
      baseContractRow({
        invoice_period: "01/12/2024 - 31/12/2024",
        discrepancy_detected: "TRUE",
        peak_rate_difference: "0.02",
      }),
    ];
    expect(isTruthyDetected("TRUE")).toBe(true);
    expect(filterContractHits(rows)).toHaveLength(1);
    expect(hasElectricityHits(rows, [])).toBe(true);
  });

  it("flags gas overcharge above epsilon and sums exposure across periods", () => {
    const belowEpsilon = baseGasRow({
      annual_potential_overcharge: String(DISCREPANCY_NUMERIC_EPSILON / 2),
    });
    const hitOne = baseGasRow({
      invoice_period: "01/01/2024 - 31/01/2024",
      annual_potential_overcharge: "$1,000.00",
    });
    const hitTwo = baseGasRow({
      invoice_period: "01/02/2024 - 28/02/2024",
      annual_potential_overcharge: "$500.00",
    });

    expect(isGasOvercharged(belowEpsilon)).toBe(false);
    expect(isGasOvercharged(hitOne)).toBe(true);
    expect(hasGasHits([belowEpsilon, hitOne, hitTwo])).toBe(true);
    expect(filterGasHits([belowEpsilon, hitOne, hitTwo])).toHaveLength(2);

    const summary = pickGasSummary([belowEpsilon, hitOne, hitTwo], "summed");
    expect(summary.hitCount).toBe(2);
    expect(summary.totalAnnualOvercharge).toBe(1500);
    expect(summary.moreCount).toBe(1);
  });
});
