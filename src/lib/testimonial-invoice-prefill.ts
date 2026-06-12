import { SOLUTION_TYPE_LABELS } from "@/lib/testimonial-solution-content";

/** Parse ex-GST savings from sheet/CRM text e.g. "$2,280", "2275.96", "$3528/ year". */
export function parseTestimonialSavingsAmount(raw?: string | null): number | null {
  if (!raw?.trim()) return null;
  const cleaned = raw.trim().replace(/[$,]/g, "").replace(/\s*\/\s*year/gi, "");
  const match = cleaned.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const num = Number.parseFloat(match[0]);
  return Number.isFinite(num) && num > 0 ? num : null;
}

const PARTIAL_TYPE_MAP: Array<{ needle: string; id: string }> = [
  { needle: "c&i electricity dma", id: "ci_electricity_dma_review" },
  { needle: "c&i electricity", id: "ci_electricity" },
  { needle: "sme electricity", id: "sme_electricity" },
  { needle: "c&i gas", id: "ci_gas" },
  { needle: "sme gas", id: "sme_gas" },
  { needle: "small gas", id: "sme_gas" },
  { needle: "waste", id: "waste" },
  { needle: "resource recovery", id: "resource_recovery" },
  { needle: "oil", id: "resource_recovery" },
  { needle: "solar panel cleaning", id: "solar_panel_cleaning" },
  { needle: "direct metering", id: "dma" },
  { needle: "dma", id: "dma" },
  { needle: "demand response", id: "demand_response" },
  { needle: "solar rooftop", id: "solar_rooftop" },
  { needle: "solar car", id: "solar_carpark" },
  { needle: "cleaning bot", id: "robot_cleaning" },
];

/** Map testimonial type label (sheet column B) to one-month-savings line item fields. */
export function testimonialTypeToSolutionFields(typeLabel?: string | null): {
  solutionType: string;
  solutionLabel: string;
} {
  const label = (typeLabel || "").trim();
  if (!label) {
    return { solutionType: "other", solutionLabel: "Savings" };
  }
  const lower = label.toLowerCase();
  for (const [id, knownLabel] of Object.entries(SOLUTION_TYPE_LABELS)) {
    if (knownLabel.toLowerCase() === lower) {
      return { solutionType: id, solutionLabel: knownLabel };
    }
  }
  for (const { needle, id } of PARTIAL_TYPE_MAP) {
    if (lower.includes(needle)) {
      return {
        solutionType: id,
        solutionLabel: SOLUTION_TYPE_LABELS[id] || label,
      };
    }
  }
  return {
    solutionType: label.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "").toLowerCase() || "other",
    solutionLabel: label,
  };
}

export function canGenerateInvoiceFromTestimonial(item: {
  status: string;
  testimonial_type?: string | null;
  testimonial_savings?: string | null;
}): boolean {
  const okStatus = item.status === "Approved" || item.status === "Not set";
  if (!okStatus) return false;
  return Boolean(
    parseTestimonialSavingsAmount(item.testimonial_savings) || (item.testimonial_type || "").trim()
  );
}
