import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface InsightCalloutProps {
  title: string;
  children: ReactNode;
  icon?: ReactNode;
  variant?: "info" | "warning" | "success";
  action?: ReactNode;
  className?: string;
}

const variantStyles = {
  info: "from-teal-500/10 via-brand-disclosure/5 to-primary/5 border-teal-200/60 dark:border-teal-800/40",
  warning: "from-semantic-flag/10 via-amber-50/50 to-orange-50/30 border-semantic-flag/30 dark:border-semantic-flag/20",
  success: "from-brand-disclosure/10 via-emerald-50/50 to-green-50/30 border-brand-disclosure/30 dark:border-brand-disclosure/20",
};

export function InsightCallout({
  title,
  children,
  icon,
  variant = "info",
  action,
  className,
}: InsightCalloutProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-gradient-to-br p-4 shadow-sm",
        variantStyles[variant],
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {icon && (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-gray-dark">
            <span className="[&>svg]:size-4">{icon}</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-dark dark:text-white">
            {title}
          </p>
          <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {children}
          </div>
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
    </div>
  );
}
