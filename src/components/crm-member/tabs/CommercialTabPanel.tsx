"use client";

import { useEffect, useState } from "react";
import { MemberSubTabs } from "../shared/MemberSubTabs";
import { SavingsTab } from "./SavingsTab";
import { NewRevenueTab } from "./NewRevenueTab";
import { TestimonialsTab } from "./TestimonialsTab";
import type { SavingsSubTab } from "../member-tab-utils";

export interface CommercialTabPanelProps {
  initialSubTab?: SavingsSubTab;
  businessInfo: Record<string, unknown> | null;
  clientId?: number | null;
}

const SAVINGS_SUB_TABS = [
  { id: "savings", label: "1st Month Savings" },
  { id: "new-revenue", label: "Discrepancy / New Revenue" },
  { id: "testimonials", label: "Testimonials" },
] as const;

export function CommercialTabPanel({
  initialSubTab = "savings",
  businessInfo,
  clientId,
}: CommercialTabPanelProps) {
  const [subTab, setSubTab] = useState<SavingsSubTab>(initialSubTab);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  return (
    <div className="space-y-4">
      <MemberSubTabs
        className="-mx-1 px-1"
        tabs={[...SAVINGS_SUB_TABS]}
        active={subTab}
        onChange={(id) => setSubTab(id as SavingsSubTab)}
      />

      {subTab === "savings" && <SavingsTab businessInfo={businessInfo} />}
      {subTab === "new-revenue" && <NewRevenueTab businessInfo={businessInfo} />}
      {subTab === "testimonials" && (
        <TestimonialsTab businessInfo={businessInfo} clientId={clientId} />
      )}
    </div>
  );
}
