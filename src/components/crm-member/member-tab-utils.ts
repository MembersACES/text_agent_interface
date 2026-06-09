import type { MemberTab } from "./types";

export type CommercialSubTab = "offers" | "savings" | "testimonials";
export type ActivitySubTab = "activity" | "notes";
export type SolutionsSubTab = "solutions" | "strategy";

const TAB_ALIASES: Record<string, MemberTab> = {
  offers: "commercial",
  savings: "commercial",
  testimonials: "commercial",
  notes: "activity",
  strategy: "solutions",
  tools: "overview",
};

const SUBTAB_FROM_TAB: Record<string, CommercialSubTab | ActivitySubTab | SolutionsSubTab> = {
  offers: "offers",
  savings: "savings",
  testimonials: "testimonials",
  notes: "notes",
  strategy: "strategy",
};

export const MEMBER_TABS: MemberTab[] = [
  "overview",
  "documents",
  "utilities",
  "activity",
  "commercial",
  "solutions",
  "climate",
];

export function resolveMemberTab(raw: string | null): {
  tab: MemberTab;
  subTab?: CommercialSubTab | ActivitySubTab | SolutionsSubTab;
} {
  if (!raw) return { tab: "overview" };

  if (TAB_ALIASES[raw]) {
    const tab = TAB_ALIASES[raw];
    const subTab = SUBTAB_FROM_TAB[raw];
    return subTab ? { tab, subTab } : { tab };
  }

  if (MEMBER_TABS.includes(raw as MemberTab)) {
    return { tab: raw as MemberTab };
  }

  return { tab: "overview" };
}
