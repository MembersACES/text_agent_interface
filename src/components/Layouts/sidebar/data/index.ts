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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import ACESLogo from "@/../public/images/logo/CARBON ZERO Logo.png";

export const ACES_BRAND = {
  name: "ACES",
  logo: ACESLogo,
};

export type NavItemIcon = LucideIcon;

export interface NavLinkItem {
  title: string;
  url: string;
  icon?: NavItemIcon;
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

export const NAV_DATA: NavSection[] = [
  {
    label: "Main",
    items: [
      { title: "Tasks", url: "/tasks", icon: CheckSquare },
      { title: "Member Profile", url: "/business-info", icon: Building2 },
      { title: "Workflows", url: "/workflows", icon: GitBranch },
      { title: "Solution Range", url: "/solution-range", icon: LayoutGrid },
      { title: "Invoice & Data Lodgement", url: "/document-lodgement", icon: FileUp },
      { title: "Base 1 Hub", url: "/base-1", icon: BarChart3 },
      { title: "Robot Dashboard", url: "/robot-dashboard", icon: Bot },
      { title: "Invoicing", url: "/invoicing", icon: FileText },
      { title: "GHG Reporting", url: "/ghg-reporting", icon: FileText },
      { title: "Personal Assistant", url: "/personal-assistant", icon: Sparkles },
    ],
  },
  {
    label: "CRM",
    items: [
      { title: "Dashboard", url: "/crm", icon: LayoutDashboard },
      { title: "Members", url: "/crm-members", icon: Users },
      { title: "Offers", url: "/offers", icon: HandCoins },
      { title: "Autonomous Agent", url: "/autonomous-agent", icon: Bot },
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
