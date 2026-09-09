export const STOP_REASON_LABELS: Record<string, string> = {
  agreement_signed: "Agreement signed",
  invoice_received: "Invoice received",
  negative_sentiment_stop: "Negative sentiment",
  manual_stop: "Stopped manually",
  policy: "Policy",
  unsubscribed: "Unsubscribed",
};

export function stopReasonLabel(reason: string | null | undefined): string {
  if (!reason) return "";
  return STOP_REASON_LABELS[reason] ?? reason.replace(/_/g, " ");
}

export function gmailThreadUrl(threadId: string): string {
  return `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(threadId)}`;
}
