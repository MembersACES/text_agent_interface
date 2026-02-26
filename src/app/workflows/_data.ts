import {
  FolderPlus,
  MapPin,
  FileSignature,
  Zap,
  Flame,
  Trash2,
  Fuel,
  Bot,
  Target,
  Presentation,
  FileCheck,
  FileUp,
  Receipt,
  Plug,
  MessageSquare,
} from "lucide-react";

export interface WorkflowCard {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

/** Grouped workflow cards for the hub (same card design as home). */
export const WORKFLOW_CARD_GROUPS: { label: string; cards: WorkflowCard[] }[] = [
  {
    label: "Client Onboarding",
    cards: [
      { title: "Google Drive - New Client Creation", description: "Create folder structure and file LOA", href: "/loa-upload", icon: FolderPlus, color: "from-green-500 to-emerald-600" },
      { title: "Site Profiling", description: "Profile and capture site details", href: "/site-profiling", icon: MapPin, color: "from-teal-500 to-cyan-600" },
      { title: "New Client LOA Generation", description: "Generate new LOA and/or SFA documents", href: "/new-client-loa", icon: FileSignature, color: "from-purple-500 to-pink-600" },
    ],
  },
  {
    label: "Utility Information",
    cards: [
      { title: "C&I Electricity Invoice Information", description: "Commercial & industrial electricity", href: "/utility-invoice-info/ci-electricity", icon: Zap, color: "from-amber-500 to-yellow-600" },
      { title: "SME Electricity Invoice Information", description: "Small to medium business electricity", href: "/utility-invoice-info/sme-electricity", icon: Zap, color: "from-yellow-500 to-amber-600" },
      { title: "C&I Gas Invoice Information", description: "Commercial & industrial gas", href: "/utility-invoice-info/ci-gas", icon: Flame, color: "from-orange-500 to-red-500" },
      { title: "SME Gas Invoice Information", description: "Small to medium business gas", href: "/utility-invoice-info/sme-gas", icon: Flame, color: "from-red-500 to-rose-600" },
      { title: "Waste Invoice Information", description: "Waste and recycling data", href: "/utility-invoice-info/waste", icon: Trash2, color: "from-slate-500 to-gray-600" },
      { title: "Oil Invoice Information", description: "Oil and fuel data", href: "/utility-invoice-info/oil", icon: Fuel, color: "from-stone-600 to-neutral-700" },
      { title: "Robot Cleaning Data", description: "Robot cleaning utility data", href: "/utility-invoice-info/robot", icon: Bot, color: "from-indigo-500 to-violet-600" },
    ],
  },
  {
    label: "Strategy & Proposals",
    cards: [
      { title: "Initial Strategy Generator", description: "Generate initial strategy and proposals", href: "/initial-strategy-generator", icon: Target, color: "from-indigo-500 to-purple-600" },
      { title: "Solutions Strategy Generator", description: "Generate solutions strategy", href: "/strategy-generator", icon: Target, color: "from-violet-500 to-purple-600" },
      { title: "Canva Pitch Deck", description: "Create and manage Canva pitch decks", href: "/canva-pitch-deck", icon: Presentation, color: "from-pink-500 to-rose-600" },
    ],
  },
  {
    label: "Documents",
    cards: [
      { title: "Document Generation", description: "Create and manage client documents", href: "/document-generation", icon: FileCheck, color: "from-orange-500 to-amber-600" },
      { title: "Signed Agreement Lodgement", description: "Lodge signed agreements", href: "/signed-agreement-lodgement", icon: FileUp, color: "from-emerald-500 to-teal-600" },
      { title: "1st Month Savings Invoice", description: "First month savings invoicing", href: "/one-month-savings", icon: Receipt, color: "from-cyan-500 to-blue-600" },
    ],
  },
  {
    label: "Integrations",
    cards: [
      { title: "Airtable Integration", description: "Connect and sync with Airtable", href: "/airtable-integration", icon: Plug, color: "from-blue-500 to-indigo-600" },
      { title: "Text Agent", description: "Text agent and automation", href: "/agent", icon: MessageSquare, color: "from-sky-500 to-blue-600" },
    ],
  },
];
