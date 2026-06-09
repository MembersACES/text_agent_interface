import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: "default" | "text" | "circular" | "rectangular";
}

const variantClasses = {
  default: "rounded-md",
  text: "rounded h-4",
  circular: "rounded-full",
  rectangular: "rounded-none",
};

export function Skeleton({
  className,
  variant = "default",
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gray-200 dark:bg-dark-3",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      <span
        aria-hidden
        className="skeleton-shimmer absolute inset-0 -translate-x-full motion-reduce:animate-none"
      />
    </div>
  );
}

export function RecordRowSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-start gap-3 px-4 py-3", className)}>
      <Skeleton className="h-8 w-8 shrink-0" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton variant="text" className="h-4 w-2/3" />
        <Skeleton variant="text" className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
    </div>
  );
}
