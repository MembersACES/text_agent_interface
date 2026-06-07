import Link from "next/link";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export type StatTrendVariant = "up" | "down" | "neutral" | "warn";

const trendVariantStyles: Record<StatTrendVariant, string> = {
  up: "bg-semantic-ok/10 text-semantic-ok",
  down: "bg-semantic-block/10 text-semantic-block",
  warn: "bg-semantic-flag/10 text-semantic-flag",
  neutral: "bg-gray/80 text-gray-600 dark:bg-dark-3 dark:text-gray-400",
};

function InlineSparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const width = 56;
  const height = 20;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="mt-2 h-5 w-14 shrink-0 text-primary"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export interface StatCardProps {
  label: string;
  value: ReactNode;
  trendLabel?: string;
  trendVariant?: StatTrendVariant;
  /** Weekly bucket counts from real created_at data; hidden when null */
  sparkline?: number[] | null;
  detailTooltip?: string;
  icon?: ReactNode;
  href?: string;
  className?: string;
  /** @deprecated prefer trendLabel */
  trend?: ReactNode;
  /** @deprecated accent stripes removed — kept for call-site compatibility */
  accent?: string;
  footer?: ReactNode;
}

export function StatCard({
  label,
  value,
  trendLabel,
  trendVariant = "neutral",
  sparkline,
  detailTooltip,
  icon,
  href,
  className,
  trend,
  footer,
}: StatCardProps) {
  const content = (
    <div
      className={cn(
        "rounded-2xl bg-white shadow-sm dark:bg-gray-dark p-3.5 transition-all duration-300",
        href && "cursor-pointer hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-primary/30",
        className,
      )}
      title={detailTooltip}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums leading-none tracking-[-0.02em] text-dark dark:text-white">
            {value}
          </p>
          {(trendLabel || sparkline) && (
            <div className="mt-1.5 flex items-end gap-2">
              {trendLabel && (
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    trendVariantStyles[trendVariant],
                  )}
                >
                  {trendLabel}
                </span>
              )}
              {sparkline && sparkline.length >= 2 && <InlineSparkline data={sparkline} />}
            </div>
          )}
          {!trendLabel && trend && (
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{trend}</p>
          )}
          {footer && <div className="mt-2">{footer}</div>}
        </div>
        {icon && (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <span className="[&>svg]:size-4">{icon}</span>
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block rounded-2xl focus-visible:outline-none">
        {content}
      </Link>
    );
  }
  return content;
}
