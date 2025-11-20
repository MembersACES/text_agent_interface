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
      { title: "My Tasks", url: "/tasks", icon: Icons.TaskIcon, items: [] },
      { title: "Agent", url: "/agent", items: [] },
      
      // Create sub-sections for grouping
      {
        title: "Data & Information",
        items: [
          { title: "Business Info", url: "/business-info" },
          { title: "Utility Invoice Information", url: "/utility-invoice-info" },
          { title: "Site Profiling", url: "/site-profiling" },
        ],
      },
      {
        title: "Document Management", 
        items: [
          { title: "Document Generation", url: "/document-generation" },
          { title: "Invoice & Data Lodgement", url: "/document-lodgement" },
          { title: "Signed Agreement Lodgement", url: "/signed-agreement-lodgement" },
        ],
      },
      { title: "Solution Range", url: "/solution-range", items: [] },
      {
        title: "Client & Strategy",
        items: [
          { title: "New Client LOA Generation", url: "/new-client-loa" },
          { title: "Google Drive - New Client Creation", url: "/loa-upload" },
          { title: "Initial Strategy Generator", url: "/initial-strategy-generator" },
          { title: "Solutions Strategy Generator", url: "/strategy-generator" },
          { title: "Canva Page", url: "/canva-pitch-deck" },
          { title: "Airtable Integration", url: "/airtable-integration" },
        ],
      },
    ],
  },
  {
    label: "OTHERS",
    items: [
      {
        title: "MAIN MENU",
        items: [
          { title: "Dashboard", url: "/dashboard", icon: Icons.HomeIcon, items: [] },
          { title: "Calendar", url: "/calendar", icon: Icons.Calendar, items: [] },
          {
            title: "Forms",
            icon: Icons.Alphabet,
            items: [
              { title: "Form Elements", url: "/forms/form-elements" },
              { title: "Form Layout", url: "/forms/form-layout" },
            ],
          },
          {
            title: "Tables",
            url: "/tables",
            icon: Icons.Table,
            items: [{ title: "Tables", url: "/tables" }],
          },
          { title: "Document Lodgement", url: "/document-lodgement", icon: Icons.Table, items: [] },
          { title: "LOA Upload", url: "/loa-upload", icon: Icons.Alphabet, items: [] },
        ],
      },
      { title: "Charts", icon: Icons.PieChart, items: [{ title: "Basic Chart", url: "/charts/basic-chart" }] },
      {
        title: "UI Elements",
        icon: Icons.FourCircle,
        items: [
          { title: "Alerts", url: "/ui-elements/alerts" },
          { title: "Buttons", url: "/ui-elements/buttons" },
        ],
      },
      { title: "Authentication", icon: Icons.Authentication, items: [{ title: "Sign In", url: "/auth/sign-in" }] },
    ],
  },
];