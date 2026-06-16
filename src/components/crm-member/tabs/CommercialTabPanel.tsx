"use client";

import { useEffect, useState } from "react";
import { MemberSubTabs } from "../shared/MemberSubTabs";
import { OffersTab } from "./OffersTab";
import { SavingsTab } from "./SavingsTab";
import { TestimonialsTab } from "./TestimonialsTab";
import type { Offer } from "../types";
import type { CommercialSubTab } from "../member-tab-utils";

export interface CommercialTabPanelProps {
  initialSubTab?: CommercialSubTab;
  offers: Offer[];
  onCreateOfferClick: () => void;
  businessInfo: Record<string, unknown> | null;
  clientId?: number | null;
}

const COMMERCIAL_SUB_TABS = [
  { id: "offers", label: "Offers" },
  { id: "savings", label: "1st Month Savings" },
  { id: "testimonials", label: "Testimonials" },
] as const;

export function CommercialTabPanel({
  initialSubTab = "offers",
  offers,
  onCreateOfferClick,
  businessInfo,
  clientId,
}: CommercialTabPanelProps) {
  const [subTab, setSubTab] = useState<CommercialSubTab>(initialSubTab);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  return (
    <div className="space-y-4">
      <MemberSubTabs
        className="-mx-1 px-1"
        tabs={[...COMMERCIAL_SUB_TABS]}
        active={subTab}
        onChange={(id) => setSubTab(id as CommercialSubTab)}
      />

      {subTab === "offers" && (
        <OffersTab offers={offers} onCreateOfferClick={onCreateOfferClick} />
      )}
      {subTab === "savings" && <SavingsTab businessInfo={businessInfo} />}
      {subTab === "testimonials" && (
        <TestimonialsTab businessInfo={businessInfo} clientId={clientId} />
      )}
    </div>
  );
}
