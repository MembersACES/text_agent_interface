import Link from "next/link";
import { cn } from "@/lib/utils";

interface ProgressModuleRowProps {
  label: string;
  percent: number;
  href?: string;
  status?: "ok" | "flag" | "block" | "neutral";
  className?: string;
}

const barColors = {
  ok: "bg-semantic-ok",
  flag: "bg-semantic-flag",
  block: "bg-semantic-block",
  neutral: "bg-primary",
};

export function ProgressModuleRow({
  label,
  percent,
  href,
  status = "neutral",
  className,
}: ProgressModuleRowProps) {
  const inner = (
    <div
      className={cn(
        "rounded-xl border border-stroke/60 bg-white px-4 py-3 transition-colors dark:border-dark-3 dark:bg-gray-dark",
        href && "hover:border-primary/30 hover:bg-primary/5 dark:hover:bg-primary/10",
        className,
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-dark dark:text-white">
          {label}
        </span>
        <span className="text-xs font-semibold tabular-nums text-gray-600 dark:text-gray-400">
          {Math.round(percent)}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-2 dark:bg-dark-3">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            barColors[status],
          )}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  return inner;
}
