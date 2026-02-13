import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: "default" | "text" | "circular" | "rectangular";
}

export function Skeleton({ 
  className, 
  variant = "default",
  ...props 
}: SkeletonProps) {
  const baseClasses = "animate-pulse bg-gray-200 dark:bg-dark-3";
  const variantClasses = {
    default: "rounded-md",
    text: "rounded h-4",
    circular: "rounded-full",
    rectangular: "rounded-none",
  };

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
