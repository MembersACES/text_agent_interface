import type { MemberTab } from "./types";

export type SavingsSubTab = "savings" | "new-revenue" | "testimonials";
export type CommercialSubTab = SavingsSubTab;
export type ActivitySubTab = "activity" | "notes";
export type SolutionsSubTab = "solutions" | "strategy";

const SAVINGS_SUBTABS = new Set<string>(["savings", "new-revenue", "testimonials"]);

const TAB_ALIASES: Record<string, MemberTab> = {
  notes: "activity",
  strategy: "solutions",
  tools: "overview",
};

const SUBTAB_FROM_TAB: Record<string, ActivitySubTab | SolutionsSubTab> = {
  notes: "notes",
  strategy: "strategy",
};

export const MEMBER_TABS: MemberTab[] = [
  "overview",
  "documents",
  "offers",
  "activity",
  "utilities",
  "savings",
  "solutions",
  "climate",
];

export function resolveMemberTab(
  raw: string | null,
  rawSubTab: string | null = null,
): {
  tab: MemberTab;
  subTab?: SavingsSubTab | ActivitySubTab | SolutionsSubTab;
} {
  if (!raw) return { tab: "overview" };

  if (raw === "commercial") {
    if (rawSubTab && SAVINGS_SUBTABS.has(rawSubTab)) {
      return { tab: "savings", subTab: rawSubTab as SavingsSubTab };
    }
    return { tab: "offers" };
  }

  if (raw === "new-revenue" || raw === "testimonials") {
    return { tab: "savings", subTab: raw };
  }

  if (raw === "savings") {
    const sub =
      rawSubTab && SAVINGS_SUBTABS.has(rawSubTab)
        ? (rawSubTab as SavingsSubTab)
        : "savings";
    return { tab: "savings", subTab: sub };
  }

  if (raw === "offers") {
    return { tab: "offers" };
  }

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
