import Link from "next/link";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export type ActivityFeedType = "ok" | "flag" | "info" | "block";

const typeStyles: Record<
  ActivityFeedType,
  { iconBg: string; iconText: string }
> = {
  ok: {
    iconBg: "bg-brand-disclosure/15",
    iconText: "text-brand-disclosure",
  },
  flag: {
    iconBg: "bg-semantic-flag/15",
    iconText: "text-semantic-flag",
  },
  info: {
    iconBg: "bg-primary/10",
    iconText: "text-primary",
  },
  block: {
    iconBg: "bg-semantic-block/15",
    iconText: "text-semantic-block",
  },
};

interface ActivityFeedItemProps {
  icon: ReactNode;
  title: string;
  meta?: ReactNode;
  timestamp?: string;
  href?: string;
  hrefLabel?: string;
  type?: ActivityFeedType;
  highlighted?: boolean;
  className?: string;
}

export function ActivityFeedItem({
  icon,
  title,
  meta,
  timestamp,
  href,
  hrefLabel = "View",
  type = "info",
  highlighted = false,
  className,
}: ActivityFeedItemProps) {
  const styles = typeStyles[type];

  return (
    <li
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 px-4 py-3",
        highlighted && "bg-canvas/80 dark:bg-dark-2/60",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            styles.iconBg,
            styles.iconText,
          )}
        >
          <span className="[&>svg]:size-3.5">{icon}</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-dark dark:text-white">
            {title}
          </p>
          {meta && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {meta}
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {timestamp && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {timestamp}
          </span>
        )}
        {href && (
          <Link
            href={href}
            className="text-xs font-semibold text-primary hover:underline"
          >
            {hrefLabel}
          </Link>
        )}
      </div>
    </li>
  );
}
