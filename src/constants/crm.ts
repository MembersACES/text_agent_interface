export const CLIENT_STAGES = ["lead", "qualified", "won", "existing_client", "lost"] as const;

export type ClientStage = (typeof CLIENT_STAGES)[number];

export const CLIENT_STAGE_LABELS: Record<ClientStage, string> = {
  lead: "Lead",
  qualified: "Qualified",
  won: "Won",
  existing_client: "Existing Member",
  lost: "Lost",
};

export const OFFER_STATUSES = [
  "requested",
  "awaiting_response",
  "response_received",
  "autonomous_agent_trigger",
  "autonomous_agent_stopped",
  "accepted",
  "lost",
] as const;

export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  requested: "Requested",
  awaiting_response: "Awaiting Response",
  response_received: "Response Received",
  autonomous_agent_trigger: "Autonomous Agent Trigger",
  autonomous_agent_stopped: "Autonomous Agent Stopped",
  accepted: "Accepted",
  lost: "Lost",
};

/** Offer statuses used on the Autonomous Agent workspace (Running vs Stopped tabs). */
export const AUTONOMOUS_AGENT_RUNNING_STATUS = "autonomous_agent_trigger" as const;
export const AUTONOMOUS_AGENT_STOPPED_STATUS = "autonomous_agent_stopped" as const;

export const OFFER_PIPELINE_STAGES = [
  "comparison_sent",
  "engagement_form_sent",
  "engagement_form_signed",
  "contract_requested",
  "contract_received",
  "contract_sent_for_signing",
  "contract_signed_lodged",
  "contract_accepted",
  "lost",
] as const;

export type OfferPipelineStage = (typeof OFFER_PIPELINE_STAGES)[number];

export const OFFER_PIPELINE_STAGE_LABELS: Record<OfferPipelineStage, string> = {
  comparison_sent: "Comparison sent",
  engagement_form_sent: "Engagement form sent",
  engagement_form_signed: "Engagement form signed",
  contract_requested: "Contract requested",
  contract_received: "Contract received",
  contract_sent_for_signing: "Contract sent for signing",
  contract_signed_lodged: "Contract signed & lodged",
  contract_accepted: "Contract accepted",
  lost: "Lost",
};

/** Offer activity types (must match backend OfferActivityType enum) */
export const OFFER_ACTIVITY_TYPES = [
  "quote_request",
  "data_request",
  "base2_review",
  "comparison",
  "ghg_offer",
  "engagement_form",
  "engagement_form_signed",
  "contract_requested",
  "contract_received",
  "contract_sent_for_signing",
  "contract_signed_lodged",
  "discrepancy_email_sent",
  "dma_review_generated",
  "dma_email_sent",
  "eoi",
  "loa",
  "service_agreement",
  "solution_presentation",
  "manual_document",
  "manual_activity",
  "one_month_savings_invoice",
  "solar_cleaning_quote_generated",
  "solar_cleaning_quote_sent",
  "solar_cleaning_signed_offer",
  "member_document_upload",
] as const;

export type OfferActivityType = (typeof OFFER_ACTIVITY_TYPES)[number];

export const OFFER_ACTIVITY_LABELS: Record<OfferActivityType, string> = {
  quote_request: "Quote request sent",
  data_request: "Data request sent",
  base2_review: "Base 2 review run",
  comparison: "Comparison",
  ghg_offer: "GHG offer",
  engagement_form: "Engagement form generated",
  engagement_form_signed: "Engagement form signed",
  contract_requested: "Contract requested",
  contract_received: "Contract received",
  contract_sent_for_signing: "Contract sent for signing",
  contract_signed_lodged: "Contract signed & lodged",
  discrepancy_email_sent: "Discrepancy email sent",
  dma_review_generated: "DMA review generated",
  dma_email_sent: "DMA email sent",
  eoi: "EOI generated",
  loa: "LOA generated",
  service_agreement: "Service agreement generated",
  solution_presentation: "Solution presentation generated",
  manual_document: "Document / link added",
  manual_activity: "Activity note",
  one_month_savings_invoice: "1st Month Savings Invoice generated",
  solar_cleaning_quote_generated: "Solar panel cleaning quote generated",
  solar_cleaning_quote_sent: "Solar panel cleaning quote sent to client",
  solar_cleaning_signed_offer: "Solar panel cleaning signed offer uploaded",
  member_document_upload: "Member document uploaded",
};

