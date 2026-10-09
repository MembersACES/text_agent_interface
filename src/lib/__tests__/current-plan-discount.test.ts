import { describe, expect, it } from "vitest";
import { applyCurrentDiscount, discountFactor, withUsageDiscount } from "@/lib/current-plan-discount";

describe("current plan discount", () => {
  it("takes the percent off usage and supply when both are selected", () => {
    const discount = { percent: 15, target: "both" as const };
    expect(applyCurrentDiscount(43.2302, discount, "usage")).toBeCloseTo(43.2302 * 0.85, 6);
    expect(applyCurrentDiscount(0.99646, discount, "supply")).toBeCloseTo(0.99646 * 0.85, 6);
  });

  it("leaves supply alone when the discount is usage only", () => {
    const discount = { percent: 10, target: "usage" as const };
    expect(discountFactor(discount, "usage")).toBeCloseTo(0.9);
    expect(discountFactor(discount, "supply")).toBe(1);
    expect(applyCurrentDiscount(1.2, discount, "supply")).toBe(1.2);
  });

  it("leaves usage alone when the discount is supply only", () => {
    const discount = { percent: 10, target: "supply" as const };
    expect(applyCurrentDiscount(38, discount, "usage")).toBe(38);
    expect(applyCurrentDiscount(1.2, discount, "supply")).toBeCloseTo(1.08);
  });

  it("ignores an empty or zero percent", () => {
    expect(applyCurrentDiscount(38, undefined, "usage")).toBe(38);
    expect(applyCurrentDiscount(38, { percent: 0, target: "both" }, "usage")).toBe(38);
  });

  it("caps the percent at 100", () => {
    expect(applyCurrentDiscount(38, { percent: 150, target: "usage" }, "usage")).toBe(0);
  });

  it("discounts gas step rates and dollars together", () => {
    const block = withUsageDiscount(
      { rateCPerMj: 4.301, amountAud: 4165.52 },
      { percent: 10, target: "both" },
    );
    expect(block.rateCPerMj).toBeCloseTo(3.8709, 4);
    expect(block.amountAud).toBeCloseTo(3748.97, 2);
  });
});
