import { describe, expect, it } from "vitest";
import {
  extractSmeElecOffer,
  latestSmeElecInvoiceRow,
  priceSmeElectricity,
  smeElecBillCheck,
  smeElecSmeWebhookFields,
  type SmeElecOfferDraft,
} from "@/lib/sme-electricity-offer";

function workedExample(): SmeElecOfferDraft {
  return {
    tariffType: "Time of use",
    usageLines: [
      { id: "peak", label: "Peak", kwh: 3000, currentCPerKwh: 38, offerCPerKwh: 36.1 },
      { id: "shoulder", label: "Shoulder", kwh: 1000, currentCPerKwh: 30, offerCPerKwh: 28.5 },
      { id: "off_peak", label: "Off peak", kwh: 2000, currentCPerKwh: 22, offerCPerKwh: 20.9 },
    ],
    usageLineOverflow: false,
    dailySupply: { currentPerDay: 1.2, offerPerDay: 1.14 },
    metering: { currentPerDay: 0.3, offerPerDay: 0.285 },
    demandLines: [
      { id: "demand", label: "Demand", unit: "$/kW/day", quantity: 20, currentRate: 0.5, offerRate: 0.475 },
    ],
    feedIn: { kwh: 500, currentCPerKwh: 5, offerCPerKwh: 4, offerFitIsZero: false },
    invoiceReviewDays: 90,
    billKwh: 6000,
    annualUsageKwh: 25000,
  };
}

describe("priceSmeElectricity", () => {
  it("matches the sheet on the 90-day worked example", () => {
    const priced = priceSmeElectricity(workedExample());
    expect(priced.currentAnnual).toBe(11929.44);
    expect(priced.offerAnnual).toBe(11348.18);
    expect(priced.annualSavings).toBe(581.26);
    expect(priced.generateBlockers).toEqual([]);
  });

  it("uses 365 / invoice days when annual kWh is missing", () => {
    const draft = workedExample();
    draft.annualUsageKwh = undefined;
    const priced = priceSmeElectricity(draft);
    expect(priced.scale).toBeCloseTo(365 / 90, 10);
  });

  it("blocks Generate while an offer rate is still 0", () => {
    const draft = workedExample();
    draft.usageLines[0].offerCPerKwh = 0;
    const priced = priceSmeElectricity(draft);
    expect(priced.generateBlockers.some((line) => line.includes("Peak"))).toBe(true);
    expect(priced.currentAnnual).toBe(11929.44);
  });

  it("allows a zero feed-in offer only when the user ticks it", () => {
    const draft = workedExample();
    draft.feedIn = { kwh: 500, currentCPerKwh: 5, offerCPerKwh: 0, offerFitIsZero: false };
    expect(priceSmeElectricity(draft).generateBlockers.some((line) => line.includes("FiT"))).toBe(true);
    draft.feedIn.offerFitIsZero = true;
    expect(priceSmeElectricity(draft).generateBlockers.some((line) => line.includes("FiT"))).toBe(false);
  });

  it("blocks Generate when there are more than 6 usage lines", () => {
    const draft = workedExample();
    draft.usageLines = Array.from({ length: 7 }, (_, i) => ({
      id: `line-${i}`,
      label: `Line ${i + 1}`,
      kwh: 100,
      currentCPerKwh: 20,
      offerCPerKwh: 19,
    }));
    draft.usageLineOverflow = true;
    const priced = priceSmeElectricity(draft);
    expect(priced.generateBlockers[0]).toMatch(/7 usage lines/);
    expect(priced.currentAnnual).toBeNull();
  });

  it("does not invent a current rate", () => {
    const draft = workedExample();
    draft.usageLines[2].currentCPerKwh = undefined;
    const priced = priceSmeElectricity(draft);
    expect(priced.currentAnnual).toBeNull();
    expect(priced.generateBlockers.some((line) => line.includes("Off peak") && line.includes("current rate"))).toBe(true);
  });
});

describe("smeElecSmeWebhookFields", () => {
  it("sends the on-screen rates and the annual totals the sheet must match", () => {
    const fields = smeElecSmeWebhookFields(workedExample());
    expect(fields.tariff_type).toBe("Time of use");
    expect(fields.current_daily_supply).toBe("1.2");
    expect(fields.comparison_daily_supply).toBe("1.14");
    expect(fields.demand_unit).toBe("$/kW/day");
    expect(fields.demand_qty).toBe("20");
    expect(fields.current_fit_c_per_kwh).toBe("5");
    expect(fields.comparison_fit_c_per_kwh).toBe("4");
    expect(fields.offer_basis).toBe("manual");
    expect(fields.vdo_percent_diff).toBe("");
    expect(fields.lowest_annual_price).toBe("");
    expect(fields.annual_savings_ui).toBe("581.26");
    expect(fields.current_annual_cost).toBe("11929.44");
    expect(fields.offer_annual_cost).toBe("11348.18");
    expect(fields.sme_electricity_lines).toEqual([
      { label: "Peak", kwh: 3000, current_c_per_kwh: 38, offer_c_per_kwh: 36.1 },
      { label: "Shoulder", kwh: 1000, current_c_per_kwh: 30, offer_c_per_kwh: 28.5 },
      { label: "Off peak", kwh: 2000, current_c_per_kwh: 22, offer_c_per_kwh: 20.9 },
    ]);
  });

  it("sends the VDO percent and the lowest annual price typed on the card", () => {
    const draft = workedExample();
    draft.vdoPercentDiff = -12.5;
    draft.lowestAnnualPrice = 1840;
    const fields = smeElecSmeWebhookFields(draft);
    expect(fields.vdo_percent_diff).toBe("-12.5");
    expect(fields.lowest_annual_price).toBe("1840");
  });
});

describe("smeElecBillCheck", () => {
  it("shows kWh × c/kWh and supply × days, then matches the invoice total", () => {
    const draft = workedExample();
    draft.usageLines = [
      { id: "peak", label: "Peak", kwh: 477.5625, currentCPerKwh: 38.94, offerCPerKwh: 0 },
      { id: "off_peak", label: "Off peak", kwh: 1071.35, currentCPerKwh: 21.12, offerCPerKwh: 0 },
    ];
    draft.dailySupply = { currentPerDay: 1.9886, offerPerDay: 0 };
    draft.metering = undefined;
    draft.demandLines = [];
    draft.feedIn = undefined;
    draft.invoiceReviewDays = 31;
    draft.invoiceTotalExGst = 473.88;
    const bill = smeElecBillCheck(draft);
    const peak = bill.currentLines.find((line) => line.id === "peak");
    expect(peak?.working).toBe("477.5625 × 38.94c");
    expect(peak?.dollars).toBe(185.96);
    expect(bill.currentLines.find((line) => line.id === "off_peak")?.dollars).toBe(226.27);
    expect(bill.currentLines.find((line) => line.id === "daily_supply")).toMatchObject({
      working: "1.9886 × 31 days",
      dollars: 61.65,
    });
    expect(bill.currentTotal).toBe(473.88);
    expect(bill.status).toBe("match");
  });

  it("flags a calculated bill that does not match the invoice total", () => {
    const draft = workedExample();
    draft.usageLines = [{ id: "peak", label: "Peak", kwh: 100, currentCPerKwh: 20, offerCPerKwh: 0 }];
    draft.dailySupply = undefined;
    draft.metering = undefined;
    draft.demandLines = [];
    draft.feedIn = undefined;
    draft.invoiceTotalExGst = 50;
    const bill = smeElecBillCheck(draft);
    expect(bill.currentTotal).toBe(20);
    expect(bill.status).toBe("mismatch");
    expect(bill.difference).toBe(-30);
  });

  it("does not sum the bill while feed-in has no current rate", () => {
    const draft = workedExample();
    draft.feedIn = { kwh: 198.3125, currentCPerKwh: undefined, offerCPerKwh: 0, offerFitIsZero: false };
    const bill = smeElecBillCheck(draft);
    expect(bill.currentLines.find((line) => line.id === "feed_in")?.dollars).toBeNull();
    expect(bill.currentTotal).toBeNull();
    expect(bill.status).toBe("incomplete");
  });

  it("subtracts feed-in from the bill total", () => {
    const draft = workedExample();
    draft.usageLines = [{ id: "peak", label: "Peak", kwh: 100, currentCPerKwh: 20, offerCPerKwh: 0 }];
    draft.dailySupply = undefined;
    draft.metering = undefined;
    draft.demandLines = [];
    draft.feedIn = { kwh: 50, currentCPerKwh: 10, offerCPerKwh: 0, offerFitIsZero: false };
    draft.invoiceTotalExGst = 15;
    const bill = smeElecBillCheck(draft);
    expect(bill.currentLines.find((line) => line.id === "feed_in")?.dollars).toBe(-5);
    expect(bill.currentTotal).toBe(15);
    expect(bill.status).toBe("match");
  });
});

describe("extractSmeElecOffer", () => {
  it("converts Currumbin sheet cents into $/day and keeps usage in c/kWh", () => {
    const draft = extractSmeElecOffer({
      NMI: "QB027425278",
      Retailer: "Origin Energy",
      "Invoice Review Period": "28/12/2023-02/04/2024",
      "Invoice Review Number of Days": 97,
      "Peak Consumption (kWh)": 890,
      "Peak Rate (c/kWh)": 32.641,
      "Shoulder Consumption (kWh)": 290,
      "Shoulder Rate (c/kWh)": 28.181,
      "Off-Peak Consumption (kWh)": 848,
      "Off-Peak Rate (c/kWh)": 28.181,
      "Daily Supply Charge Quantity": 97,
      "Daily Supply Charge Rate": 129.797,
      "Solar Meter Charge Quantity": 97,
      "Solar Meter Charge Rate": 8.5261,
      "Solar Feed-in Quantity": 25,
      "Solar Feed-in Rate": 49,
      "Total Usage": 2028,
      "Estimated Annual Usage": 7631.134020618557,
      "Invoice Total:": 733.13,
    });
    expect(draft.tariffType).toBe("Time of use");
    expect(draft.usageLines.map((line) => [line.label, line.kwh, line.currentCPerKwh, line.offerCPerKwh])).toEqual([
      ["Peak", 890, 32.641, 0],
      ["Shoulder", 290, 28.181, 0],
      ["Off peak", 848, 28.181, 0],
    ]);
    expect(draft.dailySupply?.currentPerDay).toBeCloseTo(1.29797, 5);
    expect(draft.metering?.currentPerDay).toBeCloseTo(0.085261, 6);
    expect(draft.feedIn).toMatchObject({ kwh: 25, currentCPerKwh: 49, offerCPerKwh: 0, offerFitIsZero: false });
    expect(draft.demandLines).toEqual([]);
    expect(draft.billKwh).toBe(2028);
    expect(draft.invoiceReviewDays).toBe(97);
    expect(draft.invoiceReviewPeriod).toBe("28/12/2023-02/04/2024");
    expect(draft.usageLineOverflow).toBe(false);
  });

  it("reads a feed-in unit price stored in $/kWh as cents", () => {
    const draft = extractSmeElecOffer({
      "Solar Feed-in Quantity": 198.3125,
      "Solar Feed-in Rate": 0.011,
      "Solar Feed-in Amount": -2.18,
    });
    expect(draft.feedIn?.currentCPerKwh).toBe(1.1);
    expect(extractSmeElecOffer({ "Solar Feed-in Quantity": 198.3125, "Solar Feed-in Rate": 0.011 }).feedIn?.currentCPerKwh).toBe(1.1);
    const bill = smeElecBillCheck({
      ...draft,
      usageLines: [],
      invoiceReviewDays: 31,
      invoiceTotalExGst: undefined,
    });
    expect(bill.currentLines.find((line) => line.id === "feed_in")).toMatchObject({
      working: "198.3125 × 1.1c",
      dollars: -2.18,
    });
  });

  it("labels a single general-usage bill as flat and a two-step bill as stepped", () => {
    const flat = extractSmeElecOffer({
      "General Usage Quantity": 13752.1,
      "General Usage Rate": 32.67,
      "Daily Supply Charge Rate": 143.044,
      "Total Usage": 13752.1,
    });
    expect(flat.tariffType).toBe("Flat");
    expect(flat.usageLines.map((line) => line.label)).toEqual(["General usage"]);

    const stepped = extractSmeElecOffer({
      "General Usage Quantity": 1000,
      "General Usage Rate": 30,
      "General Usage Next Quantity": 400,
      "General Usage Next Rate": 22,
    });
    expect(stepped.tariffType).toBe("Stepped");
    expect(stepped.usageLines.map((line) => line.label)).toEqual(["Step 1", "Step 2"]);
  });

  it("reads controlled load and blocks when a seventh usage line appears", () => {
    const fields: Record<string, unknown> = {
      "Peak Consumption (kWh)": 1,
      "Peak Rate (c/kWh)": 10,
      "Shoulder Consumption (kWh)": 1,
      "Shoulder Rate (c/kWh)": 10,
      "Off-Peak Consumption (kWh)": 1,
      "Off-Peak Rate (c/kWh)": 10,
      "General Usage Quantity": 1,
      "General Usage Rate": 10,
      "General Usage Next Quantity": 1,
      "General Usage Next Rate": 10,
      "Controlled Load Quantity": 1,
      "Controlled Load Rate": 10,
      "Controlled Load 2 Quantity": 1,
      "Controlled Load 2 Rate": 12,
    };
    const draft = extractSmeElecOffer(fields);
    expect(draft.usageLines).toHaveLength(7);
    expect(draft.usageLineOverflow).toBe(true);
    expect(draft.usageLines.map((line) => line.label)).toContain("Controlled load");
    expect(draft.usageLines.map((line) => line.label)).toContain("Controlled load 2");
  });

  it("converts rolling demand cents into $/kVA/day", () => {
    const draft = extractSmeElecOffer({
      "Off-Peak Consumption (kWh)": 10,
      "Off-Peak Rate (c/kWh)": 20,
      "Peak Consumption (kWh)": 10,
      "Peak Rate (c/kWh)": 30,
      "Rolling Demand (c/kVA)": 31.119,
      "Rolling Demand (kVA/Day)": 120,
      "Summer Demand (c/kVA)": 32.791,
      "Summer Demand (kVA/Day)": 16.96,
    });
    expect(draft.demandLines).toEqual([
      {
        id: "rolling",
        label: "Rolling demand",
        unit: "$/kVA/day",
        quantity: 120,
        currentRate: 0.31119,
        offerRate: 0,
      },
      {
        id: "summer",
        label: "Summer demand",
        unit: "$/kVA/day",
        quantity: 16.96,
        currentRate: 0.32791,
        offerRate: 0,
      },
    ]);
  });

  it("picks the invoice with the latest period end", () => {
    const latest = latestSmeElecInvoiceRow([
      { "Invoice Review Period": "01/01/2024-31/01/2024", NMI: "old" },
      { "Invoice Review Period": "01/06/2025-30/06/2025 - 30 Days", NMI: "new" },
    ]);
    expect(latest?.NMI).toBe("new");
  });
});
