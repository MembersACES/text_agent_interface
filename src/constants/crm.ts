export const CLIENT_STAGES = [
  "lead",
  "qualified",
  "loa_signed",
  "data_collected",
  "analysis_in_progress",
  "offer_sent",
  "won",
  "existing_client",
  "lost",
] as const;

export type ClientStage = (typeof CLIENT_STAGES)[number];

export const CLIENT_STAGE_LABELS: Record<ClientStage, string> = {
  lead: "Lead",
  qualified: "Qualified",
  loa_signed: "LOA Signed",
  data_collected: "Data Collected",
  analysis_in_progress: "Analysis In Progress",
  offer_sent: "Offer Sent",
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

/** Offer activity types (must match backend OfferActivityType enum) */
export const OFFER_ACTIVITY_TYPES = [
  "quote_request",
  "base2_review",
  "comparison",
  "ghg_offer",
  "engagement_form",
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
  discrepancy_email_sent: "Discrepancy email sent",
  dma_review_generated: "DMA review generated",
  dma_email_sent: "DMA email sent",
};

