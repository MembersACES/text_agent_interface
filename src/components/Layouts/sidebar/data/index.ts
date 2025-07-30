import * as Icons from "../icons";
import ACESLogo from "@/../public/images/logo/ACES Logo.png";

export const ACES_BRAND = {
  name: "ACES",
  logo: ACESLogo,
};

export const NAV_DATA = [
  {
    label: "MY PAGES",
    items: [
      { title: "Agent", url: "/agent", icon: Icons.User, items: [] },
      { title: "Business Info", url: "/business-info", icon: Icons.Table, items: [] },
      { title: "Utility Invoice Information", url: "/utility-invoice-info", icon: Icons.Table, items: [] },
      { title: "Airtable Integration", url: "/airtable-integration", icon: Icons.PieChart, items: [] },
      { title: "Invoice Lodgement", url: "/document-lodgement", icon: Icons.Table, items: [] },
      { title: "New Client Creation", url: "/loa-upload", icon: Icons.Alphabet, items: [] },
      { title: "Strategy Generator", url: "/canva-pitch-deck", icon: Icons.PieChart, items: [] },
      { title: "Site Profling", url: "/site-profiling", icon: Icons.PieChart, items: [] },
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
          { title: "Profile", url: "/profile", icon: Icons.User, items: [] },
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
          {
            title: "Pages",
            icon: Icons.Alphabet,
            items: [{ title: "Settings", url: "/pages/settings" }],
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
