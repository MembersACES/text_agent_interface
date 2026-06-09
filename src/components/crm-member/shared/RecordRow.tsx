"use client";

import { cn } from "@/lib/utils";
import { ChevronDown, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { RECORD_ICON_CHIP, type RecordIconIntent } from "./recordRowIcons";

export interface RecordRowProps {
  leading?: ReactNode;
  leadingIcon?: LucideIcon;
  iconIntent?: RecordIconIntent;
  title: ReactNode;
  subtitle?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
  muted?: boolean;
  onClick?: () => void;
  className?: string;
  expandable?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  expandedContent?: ReactNode;
}

export function RecordRow({
  leading,
  leadingIcon: LeadingIcon,
  iconIntent = "neutral",
  title,
  subtitle,
  status,
  actions,
  muted = false,
  onClick,
  className,
  expandable = false,
  expanded = false,
  onExpandedChange,
  expandedContent,
}: RecordRowProps) {
  const isExpandable = expandable && expandedContent != null;

  const handleHeaderClick = () => {
    if (isExpandable && onExpandedChange) {
      onExpandedChange(!expanded);
      return;
    }
    onClick?.();
  };

  const isInteractive = isExpandable || !!onClick;
  const HeaderComp = isInteractive ? "button" : "div";

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "group flex w-full items-start gap-3 rounded-md px-4 py-3 transition-colors duration-[120ms]",
          isInteractive && !muted && "hover:bg-gray-2 dark:hover:bg-dark-2",
          muted && "opacity-60"
        )}
      >
        <HeaderComp
          type={HeaderComp === "button" ? "button" : undefined}
          onClick={isInteractive ? handleHeaderClick : undefined}
          className={cn(
            "flex min-w-0 flex-1 items-start gap-3 text-left",
            isInteractive && "cursor-pointer"
          )}
        >
          {leading ?? (
            LeadingIcon ? (
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                  RECORD_ICON_CHIP[iconIntent]
                )}
              >
                <LeadingIcon className="h-4 w-4" aria-hidden />
              </div>
            ) : null
          )}
          <div className="min-w-0 flex-1">
            <div
              className={cn(
                "truncate text-sm font-medium",
                muted ? "text-gray-500 dark:text-gray-400" : "text-gray-800 dark:text-gray-200"
              )}
            >
              {title}
            </div>
            {subtitle ? (
              <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{subtitle}</div>
            ) : null}
          </div>
          {status ? <div className="shrink-0 self-center">{status}</div> : null}
          {isExpandable ? (
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 self-center text-gray-400 transition-transform duration-[120ms]",
                expanded && "rotate-180"
              )}
              aria-hidden
            />
          ) : null}
        </HeaderComp>
        {actions ? (
          <div
            className="flex shrink-0 items-center gap-1.5 self-center group-hover:[&_.record-row-open]:border-primary group-hover:[&_.record-row-open]:bg-primary group-hover:[&_.record-row-open]:text-white"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {actions}
          </div>
        ) : null}
      </div>
      {isExpandable && expanded ? (
        <div className="border-t border-gray-100 px-4 pb-3 pt-2 pl-14 dark:border-gray-800">
          {expandedContent}
        </div>
      ) : null}
    </div>
  );
}

export function RecordRowOpenAction({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="record-row-open inline-flex shrink-0 items-center gap-1.5 rounded-md border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-colors duration-[120ms] hover:bg-primary/10"
    >
      Open
    </a>
  );
}
