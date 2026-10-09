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
  it("prices a typed Jemena quote on an NSW MIRN and does not use the Victorian card", () => {
    const q = quoteAlintaSmeGas({
      mirn: "52400205263",
      periodMj: 133421,
      invoiceDays: 87,
      periodStart: "2026-06-09",
      periodEnd: "2026-09-03",
      networkOverride: "agn",
      tariffOverride: {
        blocks: [
          { mjPerDay: 20.712, rateCPerMj: 3.784 },
          { mjPerDay: 20.384, rateCPerMj: 2.948 },
          { mjPerDay: 49.315, rateCPerMj: 2.871 },
          { mjPerDay: 2654.794, rateCPerMj: 2.882 },
          { mjPerDay: 10964.384, rateCPerMj: 2.761 },
          { mjPerDay: null, rateCPerMj: 2.684 },
        ],
        supplyCPerDay: 140.03,
      },
    });
    expect(q.serviceable).toBe(true);
    expect(q.networkId).toBeNull();
    expect(q.networkLabel).toBe("Jemena Gas Networks (NSW)");
    expect(q.offerDailyAud).toBeCloseTo(1.4003, 4);
    expect(q.slices[0].steps.map((step) => step.rateCPerMj)).toEqual([3.784, 2.948, 2.871, 2.882]);
    expect(q.flags.some((f) => f.id === "non-vic-mirn" || f.id === "no-network")).toBe(false);
  });
  it("still refuses an NSW MIRN with no portal quote", () => {
    const q = quoteAlintaSmeGas({ mirn: "52400205263", periodMj: 133421, invoiceDays: 87 });
    expect(q.serviceable).toBe(false);
    expect(q.flags.some((f) => f.id === "no-network")).toBe(true);
  });
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

describe("typed portal tariff", () => {
  it("prices the bands you type instead of BusinessDeal Flex Group 1", () => {
    const input = {
      mirn: "53216727843",
      periodMj: 136414,
      invoiceDays: 58,
      periodStart: "2026-07-27",
      periodEnd: "2026-09-22",
    };
    const portal = quoteAlintaSmeGas({
      ...input,
      tariffOverride: {
        blocks: [
          { mjPerDay: 27.4, rateCPerMj: 2.904 },
          { mjPerDay: 21.9, rateCPerMj: 2.904 },
          { mjPerDay: null, rateCPerMj: 2.563 },
        ],
        supplyCPerDay: 70.378,
      },
    });
    const group1 = quoteAlintaSmeGas(input);
    expect(portal.serviceable).toBe(true);
    expect(portal.networkId).toBe("agn");
    expect(portal.slices).toHaveLength(1);
    expect(portal.slices[0].seasonLabel).toBe("Portal tariff");
    expect(portal.slices[0].steps.map((step) => step.rateCPerMj)).toEqual([2.904, 2.904, 2.563]);
    expect(portal.offerDailyAud).toBeCloseTo(0.70378, 5);
    expect(group1.slices[0].steps[0].rateCPerMj).toBe(3.828);
    expect(portal.offerAudPerGj).not.toBeCloseTo(group1.offerAudPerGj ?? 0, 2);
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
