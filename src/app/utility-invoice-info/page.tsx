"use client";

import Link from "next/link";
import {
  Zap,
  Flame,
  Trash2,
  Droplets,
  Sparkles,
  Bot,
  Building2,
} from "lucide-react";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { QuickActionList, QuickActionRow } from "@/components/dashboard";

const tools = [
  {
    href: "/utility-invoice-info/ci-electricity",
    label: "C&I Electricity",
    description: "Commercial & industrial electricity invoices",
    icon: Zap,
  },
  {
    href: "/utility-invoice-info/sme-electricity",
    label: "SME Electricity",
    description: "Small business electricity invoices",
    icon: Zap,
  },
  {
    href: "/utility-invoice-info/ci-gas",
    label: "C&I Gas",
    description: "Commercial & industrial gas invoices",
    icon: Flame,
  },
  {
    href: "/utility-invoice-info/sme-gas",
    label: "SME Gas",
    description: "Small business gas invoices",
    icon: Flame,
  },
  {
    href: "/utility-invoice-info/waste",
    label: "Waste",
    description: "Waste invoice information",
    icon: Trash2,
  },
  {
    href: "/utility-invoice-info/oil",
    label: "Oil",
    description: "Oil invoice information",
    icon: Droplets,
  },
  {
    href: "/utility-invoice-info/cleaning",
    label: "Cleaning",
    description: "Cleaning service invoices",
    icon: Sparkles,
  },
  {
    href: "/utility-invoice-info/robot",
    label: "Robot dashboard",
    description: "Cleaning robot utility dashboard",
    icon: Bot,
  },
];

export default function UtilityInvoiceInfoPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        pageName="Utility invoice info"
        description="Select a utility type to retrieve the latest invoice details for a member."
      />
      <QuickActionList className="max-w-2xl">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <QuickActionRow
              key={tool.href}
              href={tool.href}
              icon={<Icon />}
              label={tool.label}
              description={tool.description}
            />
          );
        })}
      </QuickActionList>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Looking for a member profile instead?{" "}
        <Link href="/business-info" className="font-semibold text-primary hover:underline">
          Open member profile
        </Link>{" "}
        or{" "}
        <Link href="/crm-members" className="font-semibold text-primary hover:underline inline-flex items-center gap-1">
          <Building2 className="size-3.5" />
          browse CRM members
        </Link>
        .
      </p>
    </div>
  );
}
