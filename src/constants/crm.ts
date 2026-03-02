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
  "accepted",
  "lost",
] as const;

export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  requested: "Requested",
  awaiting_response: "Awaiting Response",
  response_received: "Response Received",
  accepted: "Accepted",
  lost: "Lost",
};

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
] as const;

export type OfferActivityType = (typeof OFFER_ACTIVITY_TYPES)[number];

export const OFFER_ACTIVITY_LABELS: Record<OfferActivityType, string> = {
  quote_request: "Quote request sent",
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
};

