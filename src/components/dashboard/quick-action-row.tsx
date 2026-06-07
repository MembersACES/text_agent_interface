import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface QuickActionRowProps {
  href: string;
  icon: ReactNode;
  label: string;
  description?: string;
  className?: string;
  onClick?: () => void;
}

export function QuickActionRow({
  href,
  icon,
  label,
  description,
  className,
  onClick,
}: QuickActionRowProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-stroke/80 bg-white px-4 py-3 transition-all duration-200",
        "hover:translate-x-0.5 hover:border-brand-disclosure/30 hover:bg-brand-disclosure/5",
        "dark:border-dark-3 dark:bg-gray-dark dark:hover:bg-brand-disclosure/10",
        className,
      )}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-brand-disclosure/15 group-hover:text-brand-disclosure">
        <span className="[&>svg]:size-4">{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-dark dark:text-white">
          {label}
        </p>
        {description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
            {description}
          </p>
        )}
      </div>
      <ArrowRight className="size-4 shrink-0 text-gray-400 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:text-brand-disclosure group-hover:opacity-100" />
    </Link>
  );
}

interface QuickActionListProps {
  children: ReactNode;
  className?: string;
}

export function QuickActionList({ children, className }: QuickActionListProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>{children}</div>
  );
}
