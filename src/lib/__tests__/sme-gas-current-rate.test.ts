import { describe, expect, it } from "vitest";
import { smeGasComparisonEnergyRate } from "@/lib/sme-gas-current-rate";

describe("smeGasComparisonEnergyRate", () => {
  it("uses the latest-period block rate when the bill changed rates mid-period", () => {
    expect(smeGasComparisonEnergyRate(true, 38.335, 25.14)).toBe(38.335);
  });

  it("keeps a real discount when the bill is a single rate period", () => {
    expect(smeGasComparisonEnergyRate(false, 38.335, 25.14)).toBe(25.14);
  });
});
