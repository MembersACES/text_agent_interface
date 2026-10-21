import { describe, expect, it } from "vitest";
import { estimateMdqGj, formatMdq, parseQuantity } from "@/lib/alinta-gas-mdq";

describe("estimateMdqGj", () => {
  it("uses Alinta's CPQ / 365 × 2 rule and rounds to a whole GJ", () => {
    expect(estimateMdqGj(50000)).toBe(274);
    expect(estimateMdqGj(47760.85)).toBe(262);
    expect(estimateMdqGj(19000)).toBe(104);
  });

  it("returns nothing for a blank or tiny quantity", () => {
    expect(estimateMdqGj(0)).toBeNull();
    expect(estimateMdqGj(-10)).toBeNull();
    expect(estimateMdqGj(50)).toBeNull();
  });
});

describe("parseQuantity", () => {
  it("reads the formatted CPQ shown on the review page", () => {
    expect(parseQuantity("19,000")).toBe(19000);
    expect(parseQuantity("47,760.85")).toBe(47760.85);
    expect(parseQuantity("")).toBeNull();
  });
});

describe("formatMdq", () => {
  it("matches the quantity format used in the agreement email", () => {
    expect(formatMdq(274)).toBe("274");
    expect(formatMdq(1274)).toBe("1,274");
  });
});
