import fs from "fs";
import path from "path";

const pageMap = {
  Agent: {
    path: "/agent",
    description: "Overview of internal AI and automation agents",
  },
  "Data & Information": {
    path: "/data-info",
    pages: {
      "Business Info": {
        path: "/business-info",
        description: "Displays full client profile, documents, and utilities",
      },
      "Utility Invoice Information": {
        path: "/utility-invoice-info",
        description: "View or generate DMA and invoice data for linked utilities",
      },
      "Site Profiling": {
        path: "/site-profiling",
        description: "View site-level profiling and setup data",
      },
    },
  },
  "Document Management": {
    path: "/document-management",
    pages: {
      "Document Generation": {
        path: "/document-generation",
        description: "Generate and manage business documents (LOAs, EOIs, contracts, etc.)",
      },
      "Invoice & Data Lodgement": {
        path: "/invoice-lodgement",
        description: "Lodge invoice and data reports into the system",
      },
      "Signed Agreement Lodgement": {
        path: "/signed-agreement-lodgement",
        description: "Upload and manage signed contracts and agreements",
      },
    },
  },
  "Solution Range": {
    path: "/solution-range",
    description: "Explore our comprehensive range of sustainable solutions and services",
  },

  "Client & Strategy": {
    path: "/client-strategy",
    pages: {
      "New Client LOA Generation": {
        path: "/new-client-loa",
        description: "Generate Letter of Authority for a new client",
      },
      "Google Drive - New Client Creation": {
        path: "/drive-client-creation",
        description: "Automate Google Drive folder setup for a new client",
      },
      "Initial Strategy Generator": {
        path: "/initial-strategy-generator",
        description: "Generate initial strategy deck for a client",
      },
      "Solutions Strategy Generator": {
        path: "/solutions-strategy-generator",
        description: "Generate EOI or strategy documents via Canva templates",
      },
      "Canva Page": {
        path: "/canva-page",
        description: "Access Canva integration for pitch decks and strategy slides",
      },
      "Airtable Integration": {
        path: "/airtable-integration",
        description: "Connect and sync client data with Airtable workspace",
      },
    },
  },
};

// --- write to JSON file ---
const outputDir = path.resolve("src/lib/floatingagent");
const outputFile = path.join(outputDir, "pageMap.json");

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputFile, JSON.stringify(pageMap, null, 2), "utf-8");

console.log(`✅ Page map generated at ${outputFile}`);
