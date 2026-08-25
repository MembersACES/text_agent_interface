import type { TestimonialSolutionContentItem } from "@/lib/testimonial-solution-content";

export const COPY_KEYS = [
  "key_outcome_metrics",
  "key_challenge_of_solution",
  "key_approach_of_solution",
  "key_outcome_of_solution",
  "key_outcome_dotpoints_1",
  "key_outcome_dotpoints_2",
  "key_outcome_dotpoints_3",
  "key_outcome_dotpoints_4",
  "key_outcome_dotpoints_5",
  "conclusion",
  "esg_scope_for_solution",
  "sdg_impact_for_solution",
] as const;

export type CopyFieldKey = (typeof COPY_KEYS)[number];

export type CopyFieldDef = {
  key: CopyFieldKey;
  label: string;
  hint: string;
  multiline?: boolean;
  max?: number;
};

export const HEADLINE_FIELDS: CopyFieldDef[] = [
  {
    key: "key_outcome_metrics",
    label: "Headline result",
    hint: "The two or three words that head the document, e.g. 'Energy Cost Reduction, Contract Optimisation'. Not a dollar figure — savings come from the member's record.",
    max: 60,
  },
];

export const STORY_FIELDS: CopyFieldDef[] = [
  {
    key: "key_challenge_of_solution",
    label: "The problem we solved",
    hint: "What was going wrong before ACES got involved. Written about the member — “The member was paying…”.",
    multiline: true,
    max: 320,
  },
  {
    key: "key_approach_of_solution",
    label: "What we did",
    hint: "The work ACES performed. One or two sentences.",
    multiline: true,
    max: 320,
  },
  {
    key: "key_outcome_of_solution",
    label: "What made the experience good",
    hint: "The service story — what the member did not have to do. This is the paragraph that reads like a quote.",
    multiline: true,
    max: 420,
  },
];

export const OUTCOME_BULLET_KEYS: CopyFieldKey[] = [
  "key_outcome_dotpoints_1",
  "key_outcome_dotpoints_2",
  "key_outcome_dotpoints_3",
  "key_outcome_dotpoints_4",
  "key_outcome_dotpoints_5",
];

export const CLOSING_FIELD: CopyFieldDef = {
  key: "conclusion",
  label: "Closing line",
  hint: "One sentence that ends the testimonial.",
  multiline: true,
  max: 180,
};

export const ESG_FIELDS: CopyFieldDef[] = [
  {
    key: "esg_scope_for_solution",
    label: "Emissions scope",
    hint: "Which GHG scope this solution affects, e.g. SCOPE 2 or SCOPE 2 & 3.",
  },
  {
    key: "sdg_impact_for_solution",
    label: "UN SDGs",
    hint: "Comma-separated, e.g. “SDG 7, 12”.",
  },
];

export function snapshotCopy(item: TestimonialSolutionContentItem): string {
  return JSON.stringify(COPY_KEYS.map((key) => item[key] ?? ""));
}

export function cloneCopy(item: TestimonialSolutionContentItem): TestimonialSolutionContentItem {
  return { ...item };
}

export function slugifySolutionType(label: string): string {
  let text = (label || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  if (!text) return "";
  if (!/^[a-z]/.test(text)) text = `type_${text}`;
  return text.slice(0, 80);
}

export const DROPDOWN_ORDER = [
  "ci_electricity",
  "sme_electricity",
  "ci_gas",
  "sme_gas",
  "waste",
  "resource_recovery",
  "dma",
  "automated_cleaning_robot",
  "solar_panel_cleaning",
  "client_endorsement",
  "ghg_roadmap",
  "solar_review",
  "gas_discrepancy",
  "electricity_discrepancy",
  "demand_reset",
  "cds",
];
