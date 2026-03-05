import type { ClientStage } from "@/constants/crm";

export interface Client {
  id: number;
  business_name: string;
  external_business_id?: string | null;
  primary_contact_email?: string | null;
  gdrive_folder_url?: string | null;
  stage: ClientStage;
  owner_email?: string | null;
}

export interface Note {
  id: number;
  business_name: string;
  client_id?: number | null;
  note: string;
  user_email: string;
  note_type: string;
  created_at: string;
}

export interface Task {
  id: number;
  title: string;
  description?: string | null;
  due_date?: string | null;
  status: string;
  assigned_to: string;
  assigned_by?: string | null;
  business_id?: number | null;
  created_at?: string;
  updated_at?: string;
  client_id?: number | null;
}

export interface Offer {
  id: number;
  client_id?: number | null;
  business_name?: string | null;
  utility_type?: string | null;
  utility_type_identifier?: string | null;
  utility_display?: string | null;
  identifier?: string | null;
  status: string;
  pipeline_stage?: string | null;
  estimated_value?: number | null;
  annual_savings?: number | null;
  current_cost?: number | null;
  new_cost?: number | null;
  created_at: string;
  updated_at?: string | null;
}

export interface ClientActivity {
  id: number;
  offer_id: number;
  activity_type: string;
  document_link?: string | null;
  external_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  created_by?: string | null;
}

export interface TimelineEvent {
  type: "stage_change" | "offer_activity";
  id: string;
  created_at: string;
  note?: string;
  user_email?: string;
  activity_type?: string;
  offer_id?: number;
  document_link?: string | null;
  created_by?: string | null;
}

export type StrategySection =
  | "past_achievements_annual"
  | "in_progress"
  | "objective"
  | "advocate"
  | "summary";

export interface StrategyItem {
  id: number;
  client_id: number;
  year: number;
  section: StrategySection | string;
  row_index: number;

  member_level_solutions?: string | null;
  details?: string | null;
  solution_type?: string | null;
  sdg?: string | null;
  key_results?: string | null;

  solution_details_1?: string | null;
  solution_details_2?: string | null;
  solution_details_3?: string | null;

  engagement_form?: string | null;
  contract_signed?: string | null;

  saving_achieved?: number | null;
  new_revenue_achieved?: number | null;
  est_saving_pa?: number | null;
  est_revenue_pa?: number | null;
  est_sav_rev_over_duration?: number | null;

  saving_start_date?: string | null;
  new_revenue_start_date?: string | null;
  est_start_date?: string | null;

  est_sav_kpi_achieved?: string | null;

  priority?: string | null;
  status?: string | null;

  offer_id?: number | null;
  activity_type?: string | null;
  excluded_from_wip?: boolean;

  created_at: string;
  updated_at: string;
}

export type MemberTab =
  | "overview"
  | "documents"
  | "utilities"
  | "offers"
  | "savings"
  | "testimonials"
  | "activity"
  | "notes"
  | "tools"
  | "solutions"
  | "strategy";
