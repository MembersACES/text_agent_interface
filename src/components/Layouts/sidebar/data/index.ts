import * as Icons from "../icons";
import ACESLogo from "@/../public/images/logo/CARBON ZERO Logo.png";

export const ACES_BRAND = {
  name: "ACES",
  logo: ACESLogo,
};

export const NAV_DATA = [
  {
    label: "Quick Access",
    items: [
      { title: "Tasks", url: "/tasks", icon: Icons.TaskIcon },
      { title: "Solution Range", url: "/solution-range", icon: Icons.FourCircle },
      { title: "Member Profile", url: "/business-info", icon: Icons.User },
      { title: "Invoice & Data Lodgement", url: "/document-lodgement", icon: Icons.Table },
      { title: "Base 1 Review Agent", url: "/base-1", icon: Icons.Table },
      { title: "Resources", url: "/resources", icon: Icons.Table },
    ],
  },
  {
    label: "Workflows",
    items: [
      { title: "Workflows", url: "/workflows", icon: Icons.FourCircle },
    ],
  },
  {
    label: "CRM",
    items: [
      { title: "CRM Dashboard", url: "/crm", icon: Icons.HomeIcon },
      { title: "Clients", url: "/clients", icon: Icons.User },
      { title: "Pipeline", url: "/pipeline", icon: Icons.TaskIcon },
      { title: "Offers", url: "/offers", icon: Icons.Table },
      { title: "Reports", url: "/reports", icon: Icons.Table },
      { title: "Activity report", url: "/reports/activities", icon: Icons.Table },
    ],
  },
  {
    label: "Development",
    items: [
      {
        title: "Template Pages",
        items: [
          { title: "Dashboard", url: "/dashboard", icon: Icons.HomeIcon },
          { title: "Calendar", url: "/calendar", icon: Icons.Calendar },
          { title: "Tables", url: "/tables", icon: Icons.Table },
          { title: "Charts", url: "/charts/basic-chart", icon: Icons.PieChart },
        ],
      },
      {
        title: "Forms",
        icon: Icons.Alphabet,
        items: [
          { title: "Form Elements", url: "/forms/form-elements" },
          { title: "Form Layout", url: "/forms/form-layout" },
        ],
      },
      {
        title: "UI Elements",
        icon: Icons.FourCircle,
        items: [
          { title: "Alerts", url: "/ui-elements/alerts" },
          { title: "Buttons", url: "/ui-elements/buttons" },
        ],
      },
      { title: "Authentication", url: "/auth/sign-in", icon: Icons.Authentication },
    ],
  },
];