"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Dropdown,
  DropdownClose,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { StageBadge } from "./StageBadge";
import { CLIENT_STAGES, CLIENT_STAGE_LABELS, type ClientStage } from "@/constants/crm";

export interface EditableStageBadgeProps {
  stage: ClientStage;
  onChange: (stage: ClientStage) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
}

export function EditableStageBadge({
  stage,
  onChange,
  disabled = false,
  className,
}: EditableStageBadgeProps) {
  const [open, setOpen] = useState(false);
  const [optimisticStage, setOptimisticStage] = useState(stage);

  useEffect(() => {
    setOptimisticStage(stage);
  }, [stage]);

  const stageOptions = useMemo(() => {
    const stages = [...CLIENT_STAGES];
    const current = stage as string;
    if (current && !stages.includes(current as ClientStage)) {
      stages.unshift(current as ClientStage);
    }
    return stages;
  }, [stage]);

  const handleSelect = (next: ClientStage) => {
    setOptimisticStage(next);
    setOpen(false);
    void onChange(next);
  };

  return (
    <Dropdown isOpen={open} setIsOpen={setOpen}>
      <DropdownTrigger
        disabled={disabled}
        className={cn(
          "inline-flex shrink-0 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-gray-dark",
          className
        )}
        aria-label={`Stage: ${CLIENT_STAGE_LABELS[optimisticStage] ?? optimisticStage}. Click to change`}
      >
        <StageBadge stage={optimisticStage} />
      </DropdownTrigger>
      <DropdownContent
        align="start"
        className="min-w-[11rem] rounded-lg border border-stroke bg-white py-1 shadow-lg dark:border-dark-3 dark:bg-gray-dark"
      >
        <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Change stage
        </p>
        {stageOptions.map((s) => (
          <DropdownClose key={s}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleSelect(s)}
              className={cn(
                "w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none dark:text-gray-200 dark:hover:bg-dark-2 dark:focus:bg-dark-2",
                optimisticStage === s && "font-semibold text-primary"
              )}
            >
              {CLIENT_STAGE_LABELS[s as ClientStage] ?? s.replace(/_/g, " ")}
            </button>
          </DropdownClose>
        ))}
      </DropdownContent>
    </Dropdown>
  );
}
