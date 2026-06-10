"use client";

import { useEffect, useState } from "react";
import { MemberSubTabs } from "../shared/MemberSubTabs";
import { SolutionsTab } from "./SolutionsTab";
import { StrategyTab } from "./StrategyTab";
import type { Client } from "../types";
import type { SolutionsSubTab } from "../member-tab-utils";

export interface SolutionsStrategyTabPanelProps {
  initialSubTab?: SolutionsSubTab;
  businessInfo: Record<string, unknown> | null;
  setBusinessInfo: (info: Record<string, unknown> | null) => void;
  clientId: number;
  client: Client;
  onSaveAdvocateMeeting: (params: {
    advocacy_meeting_date: string;
    advocacy_meeting_time: string;
    advocacy_meeting_completed: boolean;
  }) => Promise<void>;
  savingAdvocateMeeting?: boolean;
}

const SOLUTIONS_SUB_TABS = [
  { id: "strategy", label: "Strategy & WIP" },
  { id: "solutions", label: "Solutions" },
] as const;

export function SolutionsStrategyTabPanel({
  initialSubTab = "strategy",
  businessInfo,
  setBusinessInfo,
  clientId,
  client,
  onSaveAdvocateMeeting,
  savingAdvocateMeeting,
}: SolutionsStrategyTabPanelProps) {
  const [subTab, setSubTab] = useState<SolutionsSubTab>(initialSubTab);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  return (
    <div className="space-y-4">
      <MemberSubTabs
        className="-mx-1 px-1"
        tabs={[...SOLUTIONS_SUB_TABS]}
        active={subTab}
        onChange={(id) => setSubTab(id as SolutionsSubTab)}
      />

      {subTab === "solutions" && (
        <SolutionsTab
          businessInfo={businessInfo}
          setBusinessInfo={setBusinessInfo}
          client={client}
          onSaveAdvocateMeeting={onSaveAdvocateMeeting}
          savingAdvocateMeeting={savingAdvocateMeeting}
        />
      )}
      {subTab === "strategy" && (
        <StrategyTab
          clientId={clientId}
          client={client}
          onSaveAdvocateMeeting={onSaveAdvocateMeeting}
          savingAdvocateMeeting={savingAdvocateMeeting}
        />
      )}
    </div>
  );
}
