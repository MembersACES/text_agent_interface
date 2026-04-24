/**
 * Map pathname to display title for the header.
 * Used for visual/UX only; no business logic.
 */
const ROUTE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/tasks": "Tasks",
  "/solution-range": "Solution Range",
  "/business-info": "Member Profile",
  "/document-lodgement": "Invoice & Data Lodgement",
  "/base-1": "Base 1 Review Agent",
  "/robot-dashboard": "Robot Dashboard",
  "/invoicing": "Invoicing",
  "/robot-dashboard/consumables": "Consumables Tracking",
  "/resources": "Links & Passwords",
  "/resources/floating-agent": "Floating Agent",
  "/resources/dashboard-tips": "Dashboard Tips",
  "/resources/testimonial-content": "Testimonial content",
  "/resources/contract-ending": "Contract Ending / Expiring",
  "/resources/discrepancy-check": "Discrepancy Check",
  "/workflows": "Workflows",
  "/crm": "CRM Dashboard",
  "/crm-members": "Members",
  "/clients": "Members",
  "/pipeline": "Pipeline",
  "/offers": "Offers",
  "/autonomous-agent": "Autonomous Agent",
  "/reports": "Reports",
  "/reports/activities": "Activity report",
  "/loa-upload": "Google Drive - New Member Creation",
  "/site-profiling": "Site Profiling",
  "/new-client-loa": "New Member LOA Generation",
  "/utility-invoice-info/ci-electricity": "C&I Electricity Invoice Information",
  "/utility-invoice-info/sme-electricity": "SME Electricity Invoice Information",
  "/utility-invoice-info/ci-gas": "C&I Gas Invoice Information",
  "/utility-invoice-info/sme-gas": "SME Gas Invoice Information",
  "/utility-invoice-info/waste": "Waste Invoice Information",
  "/utility-invoice-info/oil": "Oil Invoice Information",
  "/utility-invoice-info/robot": "Robot Dashboard",
  "/initial-strategy-generator": "Initial Strategy Generator",
  "/strategy-generator": "Solutions Strategy Generator",
  "/canva-pitch-deck": "Canva Pitch Deck",
  "/document-generation": "Document Generation",
  "/signed-agreement-lodgement": "Signed Agreement Lodgement",
  "/one-month-savings": "1st Month Savings Invoice",
  "/solar-cleaning-quote": "Solar Panel Cleaning Quote",
  "/vinyl-robot-wrap": "Vinyl Robot Wrap",
  "/airtable-integration": "Airtable Integration",
  "/agent": "Text Agent",
  "/base-2": "Base 2 Review",
  "/dashboard": "Dashboard",
  "/calendar": "Calendar",
  "/tables": "Tables",
  "/charts/basic-chart": "Charts",
  "/forms/form-elements": "Form Elements",
  "/forms/form-layout": "Form Layout",
  "/ui-elements/alerts": "Alerts",
  "/ui-elements/buttons": "Buttons",
  "/auth/sign-in": "Sign in",
};

/** Prefix matches for dynamic segments (e.g. /crm-members/123 -> "Member") */
const ROUTE_PREFIX_TITLES: { prefix: string; title: string }[] = [
  { prefix: "/crm-members/", title: "Member" },
  { prefix: "/clients/", title: "Member" },
  { prefix: "/offers/", title: "Offer" },
  { prefix: "/autonomous-agent/", title: "Autonomous run" },
];

export function getTitleForPath(pathname: string): string {
  const exact = ROUTE_TITLES[pathname];
  if (exact) return exact;

  for (const { prefix, title } of ROUTE_PREFIX_TITLES) {
    if (pathname.startsWith(prefix)) return title;
  }

  // Fallback: format path (e.g. "document-generation" -> "Document generation")
  const segment = pathname.split("/").filter(Boolean).pop() ?? "Dashboard";
  return segment
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
