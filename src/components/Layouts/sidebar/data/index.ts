import {
  Activity,
  BarChart3,
  Bot,
  Building2,
  CalendarClock,
  CheckSquare,
  FileText,
  FileUp,
  GitBranch,
  HandCoins,
  Home,
  KeyRound,
  LayoutDashboard,
  LayoutGrid,
  Lightbulb,
  Lock,
  Sparkles,
  Users,
  AlertTriangle,
  Wallet,
  Cpu,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BRAND } from "@/lib/brand";

export { BRAND };

export type NavItemIcon = LucideIcon;

export interface NavLinkItem {
  title: string;
  url: string;
  icon?: NavItemIcon;
  /** Show a numeric badge (e.g. pending tasks) */
  badge?: number;
}

export interface NavGroupItem {
  title: string;
  icon?: NavItemIcon;
  items: { title: string; url: string }[];
}

export interface NavSection {
  label: string;
  items: (NavLinkItem | NavGroupItem)[];
}

/** Daily-use items — always visible at top, never below the fold */
export const PINNED_NAV: NavLinkItem[] = [
  { title: "Member Profile", url: "/business-info", icon: Building2 },
  { title: "Tasks", url: "/tasks", icon: CheckSquare },
  { title: "Workflows", url: "/workflows", icon: GitBranch },
];

/** Core navigation — always listed under Main */
export const MAIN_NAV: NavLinkItem[] = [
  { title: "Dashboard", url: "/crm", icon: LayoutDashboard },
  { title: "Solution Range", url: "/solution-range", icon: LayoutGrid },
  { title: "Base 1 Hub", url: "/base-1", icon: BarChart3 },
];

/** Collapsible job-to-be-done groups (closed by default) */
export const JOB_GROUPS: NavGroupItem[] = [
  {
    title: "Finance & lodgement",
    icon: Wallet,
    items: [
      { title: "Invoice & Data Lodgement", url: "/document-lodgement" },
      { title: "Invoicing", url: "/invoicing" },
    ],
  },
  {
    title: "Automation",
    icon: Cpu,
    items: [
      { title: "Autonomous Agent", url: "/autonomous-agent" },
      { title: "Robot Dashboard", url: "/robot-dashboard" },
      { title: "Personal Assistant", url: "/personal-assistant" },
    ],
  },
];

export const NAV_DATA: NavSection[] = [
  {
    label: "CRM",
    items: [
      { title: "Members", url: "/crm-members", icon: Users },
      { title: "Offers", url: "/offers", icon: HandCoins },
      { title: "Activity Report", url: "/reports/activities", icon: Activity },
    ],
  },
  {
    label: "Resources",
    items: [
      { title: "Links & Passwords", url: "/resources", icon: KeyRound },
      { title: "Floating Agent", url: "/resources/floating-agent", icon: Bot },
      { title: "Dashboard Tips", url: "/resources/dashboard-tips", icon: Lightbulb },
      { title: "Testimonial content", url: "/resources/testimonial-content", icon: FileText },
      { title: "Contract Ending / Expiring", url: "/resources/contract-ending", icon: CalendarClock },
      { title: "Discrepancy Check", url: "/resources/discrepancy-check", icon: AlertTriangle },
      { title: "Design System", url: "/design-system", icon: LayoutGrid },
    ],
  },
  {
    label: "Development",
    items: [
      {
        title: "Template Pages",
        icon: Home,
        items: [
          { title: "Dashboard", url: "/dashboard" },
          { title: "Calendar", url: "/calendar" },
          { title: "Tables", url: "/tables" },
          { title: "Charts", url: "/charts/basic-chart" },
        ],
      },
      {
        title: "Forms",
        icon: LayoutGrid,
        items: [
          { title: "Form Elements", url: "/forms/form-elements" },
          { title: "Form Layout", url: "/forms/form-layout" },
        ],
      },
      {
        title: "UI Elements",
        icon: LayoutGrid,
        items: [
          { title: "Alerts", url: "/ui-elements/alerts" },
          { title: "Buttons", url: "/ui-elements/buttons" },
        ],
      },
      { title: "Authentication", url: "/auth/sign-in", icon: Lock },
    ],
  },
];
