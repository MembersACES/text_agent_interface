import {
  JOB_GROUPS,
  MAIN_NAV,
  NAV_DATA,
  PINNED_NAV,
  type NavGroupItem,
  type NavLinkItem,
} from "@/components/Layouts/sidebar/data";
import { MEMBER_TABS } from "@/components/crm-member/member-tab-utils";
import type { MemberTab } from "@/components/crm-member/types";

export interface CatalogEntry {
  title: string;
  path: string;
  description: string;
  aliases: string[];
  group: string;
}

export interface MemberJob {
  tab: MemberTab;
  label: string;
  description: string;
  aliases: string[];
}

export interface StarterPrompt {
  label: string;
  text: string;
  /** Place the text in the input instead of sending it. */
  fillOnly?: boolean;
}

interface PageMeta {
  description: string;
  aliases?: string[];
}

const PAGE_META: Record<string, PageMeta> = {
  "/business-info": {
    description: "Search and open a member. Utilities, documents, and quick actions start here when you are not already on the member record.",
    aliases: ["business info", "member profile", "client profile", "profile"],
  },
  "/tasks": {
    description: "Tasks assigned to you, or filtered by member.",
    aliases: ["my tasks", "to do", "todos"],
  },
  "/workflows": {
    description: "Hub of operational tools: onboarding, utilities, documents, strategy, and integrations.",
    aliases: ["workflow hub", "tools"],
  },
  "/crm": {
    description: "CRM dashboard of member stages. This is not the unsigned utility pipeline.",
    aliases: ["crm", "crm dashboard", "pipeline dashboard", "member pipeline"],
  },
  "/solution-range": {
    description: "Carbon Zero solution catalogue: cleaning robots, voice agents, renewable energy, resource recovery, and related services.",
    aliases: ["solutions", "services", "solution range"],
  },
  "/base-1": {
    description: "Base 1 hub for uploading utility bills and generating the review workbook.",
    aliases: ["base 1", "base one", "bill review"],
  },
  "/distributors": {
    description: "Distributor Drive folders, documents, and uploads.",
    aliases: ["distributor"],
  },
  "/associations": {
    description: "Association folders, documents, and endorsements.",
    aliases: ["association"],
  },
  "/suppliers": {
    description: "Energy, waste, and other supplier Drive folders.",
    aliases: ["supplier"],
  },
  "/plus-es-dma": {
    description: "Plus ES direct metering agreement workflow.",
    aliases: ["plus es", "dma", "direct metering"],
  },
  "/crm-members": {
    description: "Member list. Open a member for documents, utilities, offers, savings, solutions, and climate.",
    aliases: ["members", "clients", "crm members"],
  },
  "/crm-groups": {
    description: "Member groups.",
    aliases: ["groups"],
  },
  "/offers": {
    description: "Offers across members, including autonomous-agent statuses.",
    aliases: ["offer list"],
  },
  "/reports/activities": {
    description: "Activity report across members.",
    aliases: ["activity report", "activities"],
  },
  "/document-lodgement": {
    description: "Lodge invoice and data reports.",
    aliases: ["invoice lodgement", "data lodgement", "lodgement"],
  },
  "/unsigned-pipeline": {
    description: "Unsigned utility sites by state, with invoice PDFs. Not the CRM stage pipeline.",
    aliases: ["unsigned sites", "unsigned utility pipeline"],
  },
  "/email-templates": {
    description: "Edit data request, quote request, and signed-agreement email copy.",
    aliases: ["email template", "templates"],
  },
  "/invoicing": {
    description: "Invoicing workspace, including Origin Gas, Trojan Oil, and bank rec streams.",
    aliases: ["invoices", "invoice"],
  },
  "/autonomous-agent": {
    description: "Autonomous sequence queue: running, needs attention, stopped, and completed runs.",
    aliases: ["autonomous queue", "sequence queue", "agent queue"],
  },
  "/autonomous-agent/campaigns": {
    description: "Autonomous outbound campaigns.",
    aliases: ["campaigns", "campaign"],
  },
  "/autonomous-agent/agreement-follow-up": {
    description: "Email a member an agreement PDF and start autonomous signing follow-up.",
    aliases: ["agreement follow up", "signing follow up", "follow up"],
  },
  "/autonomous-agent/templates": {
    description: "Sequence templates for autonomous email, SMS, and calls.",
    aliases: ["sequence templates", "autonomous templates"],
  },
  "/autonomous-agent/resources": {
    description: "Reference notes for how the autonomous agent is wired.",
    aliases: ["autonomous resources"],
  },
  "/robot-dashboard": {
    description: "Cleaning robot operations dashboard.",
    aliases: ["robots", "pudu", "robot dashboard"],
  },
  "/personal-assistant": {
    description: "Personal assistant agent.",
    aliases: ["assistant"],
  },
  "/rsl-agent": {
    description: "RSL voice agent.",
    aliases: ["rsl"],
  },
  "/videos": {
    description: "Video projects.",
    aliases: ["video"],
  },
  "/ghg-reporting/entities": {
    description: "GHG reporting entities linked to members.",
    aliases: ["linked entities", "reporting entities", "ghg entities"],
  },
  "/ghg-reporting/data-disclosure": {
    description: "GHG data disclosure.",
    aliases: ["data disclosure", "disclosure"],
  },
  "/ghg-reporting": {
    description: "GHG work-in-progress review.",
    aliases: ["ghg", "greenhouse gas", "wip review", "climate reporting"],
  },
  "/resources/discrepancy-check": {
    description: "Discrepancy check.",
    aliases: ["discrepancy", "discrepancy check"],
  },
  "/resources/utility-discrepancy": {
    description: "ACES waste discrepancy review.",
    aliases: ["waste discrepancy"],
  },
  "/resources/disc-engine": {
    description: "Reporting entity assurance — Marcus engine.",
    aliases: ["marcus", "marcus engine", "disc engine", "assurance"],
  },
  "/resources": {
    description: "Links and passwords for external tools.",
    aliases: ["links", "passwords", "credentials"],
  },
  "/resources/floating-agent": {
    description: "Guide for this assistant.",
    aliases: ["floating agent guide"],
  },
  "/resources/dashboard-tips": {
    description: "How the dashboard is organised.",
    aliases: ["tips", "dashboard tips"],
  },
  "/resources/testimonial-content": {
    description: "Testimonial document copy by solution type.",
    aliases: ["testimonials template", "testimonial content"],
  },
  "/resources/contract-ending": {
    description: "Contracts that are ending or expiring.",
    aliases: ["contract ending", "expiring contracts", "contract expiry"],
  },
  "/design-system": {
    description: "UI design system reference.",
    aliases: ["design system"],
  },
};

const EXTRA_PAGES: CatalogEntry[] = [
  {
    group: "Tools",
    title: "Google Drive — New Member",
    path: "/loa-upload",
    description: "Create the Google Drive folder structure and file the LOA for a new member.",
    aliases: ["new member drive", "loa upload", "drive client creation", "google drive"],
  },
  {
    group: "Tools",
    title: "Distributor folder from agreement",
    path: "/distributor-folder-creation",
    description: "Create a distributor folder from an agreement.",
    aliases: ["distributor folder"],
  },
  {
    group: "Tools",
    title: "Distributor partner access",
    path: "/distributors/partners",
    description: "Partner logins for the distributor portal.",
    aliases: ["partner access", "distributor partners"],
  },
  {
    group: "Tools",
    title: "Site Profiling",
    path: "/site-profiling",
    description: "Capture site-level profiling. On a member, this also sits with their documents and utilities.",
    aliases: ["site profile", "profiling"],
  },
  {
    group: "Tools",
    title: "New Member LOA",
    path: "/new-client-loa",
    description: "Generate a new letter of authority and service fee agreement.",
    aliases: ["new loa", "loa generation", "service fee agreement"],
  },
  {
    group: "Tools",
    title: "Update LOA",
    path: "/update-loa",
    description: "Update an existing letter of authority.",
    aliases: ["update letter of authority"],
  },
  {
    group: "Tools",
    title: "Utility invoice info",
    path: "/utility-invoice-info",
    description: "Search utility invoice data by NMI, MIRN, or account. Prefer the member Utilities tab when the member is already open.",
    aliases: ["utility data", "invoice info"],
  },
  {
    group: "Tools",
    title: "C&I Electricity",
    path: "/utility-invoice-info/ci-electricity",
    description: "Commercial and industrial electricity invoice data.",
    aliases: ["c&i electricity", "ci electricity", "nmi"],
  },
  {
    group: "Tools",
    title: "SME Electricity",
    path: "/utility-invoice-info/sme-electricity",
    description: "SME electricity invoice data.",
    aliases: ["sme electricity"],
  },
  {
    group: "Tools",
    title: "C&I Gas",
    path: "/utility-invoice-info/ci-gas",
    description: "Commercial and industrial gas invoice data.",
    aliases: ["c&i gas", "ci gas", "mirn", "mrin"],
  },
  {
    group: "Tools",
    title: "SME Gas",
    path: "/utility-invoice-info/sme-gas",
    description: "SME gas invoice data.",
    aliases: ["sme gas"],
  },
  {
    group: "Tools",
    title: "Waste invoices",
    path: "/utility-invoice-info/waste",
    description: "Waste and recycling invoice data.",
    aliases: ["waste data", "waste invoices"],
  },
  {
    group: "Tools",
    title: "Oil invoices",
    path: "/utility-invoice-info/oil",
    description: "Oil and fuel invoice data.",
    aliases: ["oil data"],
  },
  {
    group: "Tools",
    title: "Cleaning invoices",
    path: "/utility-invoice-info/cleaning",
    description: "Cleaning invoice data.",
    aliases: ["cleaning data"],
  },
  {
    group: "Tools",
    title: "Robot utility data",
    path: "/utility-invoice-info/robot",
    description: "Robot analytics opened from a member utility link.",
    aliases: ["robot data", "robot number"],
  },
  {
    group: "Tools",
    title: "Document Generation",
    path: "/document-generation",
    description: "Generate business documents, expressions of interest, and service agreements. From an open member, use Generate Documents.",
    aliases: ["generate document", "eoi", "expression of interest", "loa", "documents"],
  },
  {
    group: "Tools",
    title: "Signed Agreement Lodgement",
    path: "/signed-agreement-lodgement",
    description: "Upload and track signed contracts and agreements.",
    aliases: ["signed agreement", "upload agreement", "contract upload"],
  },
  {
    group: "Tools",
    title: "Drive Filing",
    path: "/drive-filing",
    description: "File documents into Google Drive.",
    aliases: ["google drive filing", "file to drive"],
  },
  {
    group: "Tools",
    title: "1st Month Savings Invoice",
    path: "/one-month-savings",
    description: "Invoice a member for savings achieved in the first month.",
    aliases: ["savings invoice", "first month savings", "one month savings"],
  },
  {
    group: "Tools",
    title: "Discrepancy / New Revenue Invoice",
    path: "/new-revenue",
    description: "Invoice 20% of a recovered discrepancy or new revenue stream.",
    aliases: ["new revenue invoice", "discrepancy invoice"],
  },
  {
    group: "Tools",
    title: "Send Alinta gas agreement",
    path: "/alinta-gas-agreement-request",
    description: "Send an Alinta gas agreement after the signed engagement form.",
    aliases: ["alinta gas"],
  },
  {
    group: "Tools",
    title: "Send Alinta electricity agreement",
    path: "/alinta-electricity-agreement-request",
    description: "Send an Alinta electricity agreement after the signed engagement form.",
    aliases: ["alinta electricity", "alinta elec"],
  },
  {
    group: "Tools",
    title: "Initial Strategy Generator",
    path: "/initial-strategy-generator",
    description: "Generate the initial strategy deck for a member.",
    aliases: ["initial strategy", "strategy deck"],
  },
  {
    group: "Tools",
    title: "Solutions Strategy Generator",
    path: "/solutions-strategy-generator",
    description: "Generate solution strategy documents.",
    aliases: ["solutions strategy", "strategy generator", "eoi generator"],
  },
  {
    group: "Tools",
    title: "Canva Pitch Deck",
    path: "/canva-pitch-deck",
    description: "Canva pitch decks and strategy slides.",
    aliases: ["canva", "pitch deck"],
  },
  {
    group: "Tools",
    title: "Quote request",
    path: "/quote-request",
    description: "Request quotes for services and solutions.",
    aliases: ["quote"],
  },
  {
    group: "Tools",
    title: "Blend and extend",
    path: "/blend-and-extend",
    description: "Blend-and-extend request to the current C&I electricity retailer.",
    aliases: ["b&e", "blend & extend", "blend and extend"],
  },
  {
    group: "Tools",
    title: "Solar panel cleaning quote",
    path: "/solar-cleaning-quote",
    description: "Quote for solar panel cleaning.",
    aliases: ["solar cleaning", "panel cleaning"],
  },
  {
    group: "Tools",
    title: "Vinyl robot wrap",
    path: "/vinyl-robot-wrap",
    description: "Vinyl wrap artwork for a cleaning robot.",
    aliases: ["vinyl wrap", "robot wrap"],
  },
  {
    group: "Tools",
    title: "Utility checklist",
    path: "/utility-checklist",
    description: "Checklist of utility data still needed for a member.",
    aliases: ["checklist"],
  },
  {
    group: "Tools",
    title: "Base 2 Review",
    path: "/base-2",
    description: "Base 2 review workspace.",
    aliases: ["base 2", "base two"],
  },
  {
    group: "Tools",
    title: "Airtable",
    path: "/airtable-integration",
    description: "Airtable sync.",
    aliases: ["airtable"],
  },
  {
    group: "Tools",
    title: "Text Agent",
    path: "/agent",
    description: "Internal text agent page.",
    aliases: ["text agent"],
  },
  {
    group: "Tools",
    title: "Consumables",
    path: "/robot-dashboard/consumables",
    description: "Cleaning robot consumables tracking.",
    aliases: ["consumables", "robot consumables"],
  },
  {
    group: "Tools",
    title: "Create video",
    path: "/videos/create",
    description: "Start a new video project.",
    aliases: ["new video"],
  },
  {
    group: "Finance & lodgement",
    title: "Origin Gas invoicing",
    path: "/invoicing?stream=origin-gas",
    description: "Origin Gas invoicing stream.",
    aliases: ["origin gas", "origin"],
  },
  {
    group: "Finance & lodgement",
    title: "Trojan Oil invoicing",
    path: "/invoicing?stream=trojan-oil",
    description: "Trojan Oil invoicing stream.",
    aliases: ["trojan oil", "trojan"],
  },
  {
    group: "Finance & lodgement",
    title: "Bank rec",
    path: "/invoicing?stream=bank-rec",
    description: "Bank reconciliation invoicing stream.",
    aliases: ["bank rec", "bank reconciliation"],
  },
];

const JOB_META: Record<MemberTab, { label: string; description: string; aliases: string[] }> = {
  overview: {
    label: "Overview",
    description: "Member summary, stage, and contacts.",
    aliases: ["overview", "summary"],
  },
  documents: {
    label: "Documents",
    description: "Contracts, business documents, signed EOI, engagement form, additional documents, and site photos. Upload from this tab.",
    aliases: ["documents", "site photos", "site photo", "additional document", "upload document", "signed eoi", "contracts"],
  },
  offers: {
    label: "Offers",
    description: "Offers recorded on this member.",
    aliases: ["member offers"],
  },
  activity: {
    label: "Activity",
    description: "Activity timeline and notes.",
    aliases: ["activity", "notes", "timeline"],
  },
  utilities: {
    label: "Utilities",
    description: "Linked electricity, gas, waste, oil, cleaning, and robot utilities. Each row opens the matching invoice tool.",
    aliases: ["utilities", "linked utilities", "nmi", "mirn"],
  },
  savings: {
    label: "Savings",
    description: "Savings, new revenue, and testimonials for this member.",
    aliases: ["savings", "new revenue", "testimonials"],
  },
  solutions: {
    label: "Solutions",
    description: "Solutions on the member, including strategy documents.",
    aliases: ["member solutions", "strategy"],
  },
  climate: {
    label: "Climate",
    description: "GHG and climate data on this member.",
    aliases: ["member climate", "member ghg"],
  },
};

function isGroup(item: NavLinkItem | NavGroupItem): item is NavGroupItem {
  return "items" in item;
}

function collectNav(): { title: string; path: string; group: string }[] {
  const rows: { title: string; path: string; group: string }[] = [];
  for (const item of PINNED_NAV) {
    rows.push({ title: item.title, path: item.url, group: "Pinned" });
  }
  for (const item of MAIN_NAV) {
    rows.push({ title: item.title, path: item.url, group: "Main" });
  }
  for (const group of JOB_GROUPS) {
    for (const item of group.items) {
      rows.push({ title: item.title, path: item.url, group: group.title });
    }
  }
  for (const section of NAV_DATA) {
    if (section.label === "Development") continue;
    for (const item of section.items) {
      if (isGroup(item)) {
        for (const child of item.items) {
          rows.push({ title: child.title, path: child.url, group: section.label });
        }
      } else {
        rows.push({ title: item.title, path: item.url, group: section.label });
      }
    }
  }
  return rows;
}

function buildCatalog(): CatalogEntry[] {
  const entries: CatalogEntry[] = [];
  const seen = new Set<string>();
  const add = (entry: CatalogEntry) => {
    if (seen.has(entry.path)) return;
    seen.add(entry.path);
    entries.push(entry);
  };

  for (const row of collectNav()) {
    const meta = PAGE_META[row.path];
    add({
      title: row.title,
      path: row.path,
      group: row.group,
      description: meta?.description ?? row.title,
      aliases: meta?.aliases ?? [],
    });
  }
  for (const extra of EXTRA_PAGES) add(extra);
  return entries;
}

export const APP_CATALOG: CatalogEntry[] = buildCatalog();

export const MEMBER_JOBS: MemberJob[] = MEMBER_TABS.map((tab) => ({
  tab,
  ...JOB_META[tab],
}));

export function catalogGroups(): { group: string; entries: CatalogEntry[] }[] {
  const groups: { group: string; entries: CatalogEntry[] }[] = [];
  for (const entry of APP_CATALOG) {
    const existing = groups.find((group) => group.group === entry.group);
    if (existing) existing.entries.push(entry);
    else groups.push({ group: entry.group, entries: [entry] });
  }
  return groups;
}

export function catalogForPrompt(): string {
  const pages = APP_CATALOG.map((entry) => {
    const alias = entry.aliases.length > 0 ? ` (also: ${entry.aliases.join(", ")})` : "";
    return `${entry.path} — ${entry.title} — ${entry.description}${alias}`;
  }).join("\n");
  const jobs = MEMBER_JOBS.map(
    (job) => `${job.tab} — ${job.label} — ${job.description}`
  ).join("\n");
  return `PAGES:\n${pages}\n\nMEMBER TABS (navigate with member_tab; path /crm-members):\n${jobs}`;
}

export function parseMemberId(pathname: string | undefined): number | null {
  if (!pathname) return null;
  const match = pathname.match(/^\/(?:crm-members|clients)\/(\d+)/);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) ? id : null;
}

export function memberTabHref(memberId: number, tab: MemberTab): string {
  const base = `/crm-members/${memberId}`;
  return tab === "overview" ? base : `${base}?tab=${tab}`;
}

function normalizeLookup(raw: string): string {
  let path = raw.trim().toLowerCase();
  path = path.replace(/^https?:\/\/[^/]+/, "");
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path;
}

export function resolvePage(raw: string): CatalogEntry | null {
  const query = normalizeLookup(raw);
  if (!query) return null;
  const withSlash = query.startsWith("/") ? query : `/${query}`;
  return (
    APP_CATALOG.find((entry) => entry.path.toLowerCase() === withSlash) ??
    APP_CATALOG.find((entry) => entry.title.toLowerCase() === query) ??
    APP_CATALOG.find((entry) => entry.aliases.some((alias) => alias.toLowerCase() === query)) ??
    null
  );
}

export function memberJob(tab: string): MemberJob | null {
  return MEMBER_JOBS.find((job) => job.tab === tab) ?? null;
}

export function starterPrompts(pathname: string): StarterPrompt[] {
  if (parseMemberId(pathname)) {
    return [
      { label: "Documents", text: "Where are this member's documents and site photos?" },
      { label: "Utilities", text: "How do I open this member's utilities?" },
      { label: "Tasks", text: "What tasks are on this member?" },
    ];
  }
  if (pathname.startsWith("/autonomous-agent")) {
    return [
      { label: "Queue", text: "Summarise the autonomous queue" },
      { label: "Campaigns", text: "Where are campaigns?" },
      { label: "Agreement follow-up", text: "Where do I start agreement follow-up?" },
    ];
  }
  if (pathname.startsWith("/invoicing")) {
    return [
      { label: "Origin Gas", text: "Where is Origin Gas invoicing?" },
      { label: "Trojan Oil", text: "Where is Trojan Oil invoicing?" },
      { label: "Bank rec", text: "Where is bank rec?" },
    ];
  }
  if (pathname.startsWith("/unsigned-pipeline")) {
    return [
      { label: "Gas sites", text: "How many unsigned gas sites are there?" },
      { label: "Electricity", text: "How many unsigned electricity sites are there?" },
      { label: "All utilities", text: "Summarise the unsigned pipeline for all utilities" },
    ];
  }
  return [
    { label: "My tasks", text: "What are my tasks?" },
    { label: "Unsigned pipeline", text: "Where is the unsigned pipeline?" },
    { label: "Find a member", text: "Find member ", fillOnly: true },
  ];
}
