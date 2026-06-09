import { cn } from "@/lib/utils";

export type PillarStatus = "ok" | "flag" | "block" | "neutral";

const statusBarColors: Record<PillarStatus, string> = {
  ok: "bg-semantic-ok",
  flag: "bg-semantic-flag",
  block: "bg-semantic-block",
  neutral: "bg-primary",
};

interface PillarItem {
  id: string;
  label: string;
  percent: number;
  status?: PillarStatus;
  detail?: string;
  icon?: string;
}

interface PillarGridProps {
  items: PillarItem[];
  className?: string;
}

export function PillarGrid({ items, className }: PillarGridProps) {
  return (
    <div
      className={cn(
        "grid gap-3 sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {items.map((item) => {
        const status = item.status ?? "neutral";
        return (
          <div
            key={item.id}
            className="rounded-2xl border border-stroke/80 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-dark-3 dark:bg-gray-dark"
          >
            <div className="flex items-center gap-2">
              {item.icon && (
                <span className="text-lg" aria-hidden>
                  {item.icon}
                </span>
              )}
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {item.label}
              </p>
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-dark dark:text-white">
              {Math.round(item.percent)}%
            </p>
            {item.detail && (
              <p className="mt-0.5 font-mono text-[10px] text-gray-500 dark:text-gray-400">
                {item.detail}
              </p>
            )}
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-2 dark:bg-dark-3">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500 ease-out",
                  statusBarColors[status],
                )}
                style={{ width: `${Math.min(100, Math.max(0, item.percent))}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
