export const SOLAR_ENGAGEMENT_FORM_SEQUENCE_TYPE = "solar_panel_cleaning_engagement_form_v1";

export const ACES_TEAM_FOLLOWUP_SIGNATURE_HTML = `<p style="margin-bottom:0;"><strong>The Team</strong><br>
Australian Circular Economy Solutions</p>
<p style="margin-top:16px; margin-bottom:0;"><strong>Carbon Zero Australasia</strong><br>
Australian Circular Economy Solutions Division<br>
Direct: 0468 050 399<br>
Email: <a href="mailto:business@acesolutions.com.au" style="color:#1a73e8;">business@acesolutions.com.au</a><br>
470 St Kilda Road, Melbourne VIC 3004<br>
Website: <a href="https://acesolutions.com.au" style="color:#1a73e8;">acesolutions.com.au</a></p>`;

export const SOLAR_ENGAGEMENT_SIGNATURE_HTML = `<p style="margin-bottom:0;"><strong>Amelia Williams</strong><br>
<span style="color:#666;">Customer Success Manager (CSM) – Implementation: Connects onboarding directly to future success.</span></p>
<p style="margin-top:16px; margin-bottom:0;"><strong>Carbon Zero Australasia</strong><br>
Australian Circular Economy Solutions Division<br>
Direct: 0468 050 399<br>
Email: <a href="mailto:business@acesolutions.com.au" style="color:#1a73e8;">business@acesolutions.com.au</a><br>
470 St Kilda Road, Melbourne VIC 3004<br>
Ph: 1300 849 908 | Website: <a href="https://acesolutions.com.au" style="color:#1a73e8;">acesolutions.com.au</a></p>`;

export function defaultSignatureHtmlForSequence(sequenceType: string): string {
  if ((sequenceType || "").toLowerCase().includes("solar")) {
    return SOLAR_ENGAGEMENT_SIGNATURE_HTML;
  }
  return ACES_TEAM_FOLLOWUP_SIGNATURE_HTML;
}

export function resolvedSignatureHtml(sequenceType: string, stored?: string | null): string {
  const html = (stored || "").trim();
  return html || defaultSignatureHtmlForSequence(sequenceType);
}
