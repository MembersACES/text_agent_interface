import { describe, expect, it } from "vitest";
import { parseDateRange, quoteAlintaSmeGas } from "@/lib/alinta-sme-gas";

describe("parseDateRange", () => {
  it("parses the invoice sheet period with no spaces", () => {
    expect(parseDateRange("27/03/2026-24/06/2026")).toEqual({ start: "2026-03-27", end: "2026-06-24" });
  });
  it("still parses spaced ranges", () => {
    expect(parseDateRange("27/03/2026 - 24/06/2026")).toEqual({ start: "2026-03-27", end: "2026-06-24" });
  });
});

describe("quoteAlintaSmeGas state guard", () => {
  it("refuses to price an SA MIRN on the Victorian AGN card, even when picked manually", () => {
    const q = quoteAlintaSmeGas({ mirn: "55102454015", periodMj: 54511, invoiceDays: 90, networkOverride: "agn" });
    expect(q.serviceable).toBe(false);
    expect(q.offerAudPerGj).toBeNull();
    expect(q.flags.some((f) => f.id === "non-vic-mirn")).toBe(true);
  });
  it("still prices a Victorian AGN site", () => {
    const q = quoteAlintaSmeGas({ mirn: "53202463627", periodMj: 54511, invoiceDays: 90 });
    expect(q.serviceable).toBe(true);
    expect(q.offerAudPerGj).toBeCloseTo(29.8428, 3);
  });
});

describe("offer steps", () => {
  it("East Malvern on Multinet peak uses three bands", () => {
    const q = quoteAlintaSmeGas({ mirn: "53102023079", periodMj: 66547, invoiceDays: 63, periodStart: "2026-05-26", periodEnd: "2026-07-27" });
    expect(q.networkId).toBe("multinet");
    const steps = q.slices[0].steps;
    expect(steps.map((s) => [s.fromMjPerDay, s.toMjPerDay, s.rateCPerMj])).toEqual([[0, 250, 3.278], [250, 1000, 2.673], [1000, 1500, 2.497]]);
    expect(steps.map((s) => Number(s.aud.toFixed(2)))).toEqual([516.28, 1262.99, 88.57]);
    expect(q.offerAudPerGj).toBeCloseTo(28.0681, 3);
  });
});
