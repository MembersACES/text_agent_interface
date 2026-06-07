import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface SurfacePanelProps {
  children: ReactNode;
  className?: string;
}

/** Elevated white panel — shadow only, no border (Linear/Vercel style). */
export function SurfacePanel({ children, className }: SurfacePanelProps) {
  return (
    <div className={cn("rounded-2xl bg-white shadow-sm dark:bg-gray-dark", className)}>{children}</div>
  );
}

const filterControl =
  "h-9 rounded-lg bg-canvas px-3 text-sm text-dark outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 dark:bg-dark-2 dark:text-white";

export function FilterSelect({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(filterControl, className)} {...props} />;
}

export function FilterInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(filterControl, className)} {...props} />;
}

export function FilterTextarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        filterControl,
        "min-h-[5rem] resize-y py-2",
        className,
      )}
      {...props}
    />
  );
}
