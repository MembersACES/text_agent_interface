import * as Icons from "../icons";
import ACESLogo from "@/../public/images/logo/CARBON ZERO Logo.png";

export const ACES_BRAND = {
  name: "ACES",
  logo: ACESLogo,
};

export const NAV_DATA = [
  {
    label: "Interface Pages",
    items: [
      { title: "My Tasks", url: "/tasks", icon: Icons.TaskIcon },
      { title: "Text Agent", url: "/agent" },
      { title: "Solution Range", url: "/solution-range" },
      { title: "Client Profile", url: "/business-info" },
      
      {
        title: "Client Onboarding",
        items: [
          { title: "New Client LOA Generation", url: "/new-client-loa" },
          { title: "Google Drive - New Client Creation", url: "/loa-upload" },
        ],
      },
      {
        title: "Site & Data Collection",
        items: [
          { title: "Utility Invoice Information", url: "/utility-invoice-info" },
          { title: "Invoice & Data Lodgement", url: "/document-lodgement" },
          { title: "Site Profiling", url: "/site-profiling" },
        ],
      },
      {
        title: "Strategy & Proposals",
        items: [
          { title: "Initial Strategy Generator", url: "/initial-strategy-generator" },
          { title: "Solutions Strategy Generator", url: "/strategy-generator" },
          { title: "Canva Page", url: "/canva-pitch-deck" },
        ],
      },
      {
        title: "Documents & Lodgement", 
        items: [
          { title: "Document Generation", url: "/document-generation" },
          { title: "Signed Agreement Lodgement", url: "/signed-agreement-lodgement" },
        ],
      },
      {
        title: "Integrations",
        items: [
          { title: "Airtable Integration", url: "/airtable-integration" },
        ],
      },
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