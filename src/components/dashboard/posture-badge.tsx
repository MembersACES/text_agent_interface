import { cn } from "@/lib/utils";

export type PostureVariant = "management" | "defensible" | "preview";

const variantStyles: Record<
  PostureVariant,
  { bg: string; text: string; label: string }
> = {
  management: {
    bg: "bg-amber-100 dark:bg-amber-900/40",
    text: "text-amber-900 dark:text-amber-200",
    label: "Management grade",
  },
  defensible: {
    bg: "bg-brand-disclosure/15 dark:bg-brand-disclosure/25",
    text: "text-brand-disclosure-dim dark:text-brand-disclosure",
    label: "Defensible",
  },
  preview: {
    bg: "bg-amber-100 dark:bg-amber-900/40",
    text: "text-amber-900 dark:text-amber-200",
    label: "Preview — management grade",
  },
};

interface PostureBadgeProps {
  variant?: PostureVariant;
  label?: string;
  className?: string;
}

export function PostureBadge({
  variant = "management",
  label,
  className,
}: PostureBadgeProps) {
  const styles = variantStyles[variant];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide",
        styles.bg,
        styles.text,
        className,
      )}
    >
      {label ?? styles.label}
    </span>
  );
}
