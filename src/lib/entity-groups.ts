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
  reporting_entity: {
    aligned: boolean;
    distinct_values: string[];
  };
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
