/** Shared helpers for commercial entity groups (L1). */

export function slugifyDisplayName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

export interface EntityGroupListItem {
  id: number;
  slug: string;
  display_name: string;
  primary_abn?: string | null;
  /** Climate disclosure slug (A1 entity_id); members may inherit when unset on client */
  reporting_entity?: string | null;
  notes?: string | null;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface EntityGroupDeleteResult {
  deleted: boolean;
  slug: string;
  unlinked_member_count: number;
}

export interface EntityGroupSummary {
  member_count: number;
  total_offers: number;
  any_signed: boolean;
  stage_breakdown: Record<string, number>;
  group_reporting_entity?: string | null;
  members_in_climate_rollup?: number;
  staged_activity_total?: number;
  reporting_entity: {
    aligned: boolean;
    distinct_values: string[];
  };
}

export function platformBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SUSTAINABILITY_PLATFORM_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "https://prograde-sustainability-dev-672026052958.australia-southeast2.run.app";
}

export function progradeWorkspaceUrl(entitySlug: string, period = "FY26"): string {
  return `${platformBaseUrl()}/?entity=${encodeURIComponent(entitySlug)}&period=${encodeURIComponent(period)}`;
}

export interface EntityGroupSuggestionMember {
  id: number;
  business_name: string;
  external_business_id?: string | null;
  stage: string;
}

export interface EntityGroupSuggestionCluster {
  suggested_display_name: string;
  suggested_slug: string;
  member_ids: number[];
  members: EntityGroupSuggestionMember[];
  reason: string;
  confidence: "high" | "medium" | "low";
}
