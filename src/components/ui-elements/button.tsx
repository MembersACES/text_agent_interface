import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Button as CanonicalButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LegacyVariant =
  | "primary"
  | "green"
  | "dark"
  | "outlinePrimary"
  | "outlineGreen"
  | "outlineDark";

type LegacyShape = "default" | "rounded" | "full";
type LegacySize = "default" | "small";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon?: ReactNode;
  variant?: LegacyVariant;
  shape?: LegacyShape;
  size?: LegacySize;
};

const legacyVariantStyles: Record<LegacyVariant, string> = {
  primary: "",
  green: "bg-green text-white hover:bg-opacity-90",
  dark: "bg-dark text-white dark:bg-white/10",
  outlinePrimary: "border border-primary bg-transparent text-primary hover:bg-primary/10",
  outlineGreen: "border border-green bg-transparent text-green hover:bg-green/10",
  outlineDark:
    "border border-dark bg-transparent text-dark hover:bg-dark/10 dark:border-white/25 dark:text-white dark:hover:bg-white/10",
};

const legacyShapeStyles: Record<LegacyShape, string> = {
  default: "rounded-none",
  rounded: "rounded-[5px]",
  full: "rounded-full",
};

const legacySizeStyles: Record<LegacySize, string> = {
  default: "py-3.5 px-10 lg:px-8 xl:px-10 font-medium",
  small: "py-[11px] px-6 font-medium",
};

function mapLegacyVariant(
  variant: LegacyVariant,
): "primary" | "secondary" | "ghost" | "danger" {
  if (variant === "primary") return "primary";
  if (variant === "outlinePrimary" || variant === "outlineGreen" || variant === "outlineDark") {
    return "ghost";
  }
  return "ghost";
}

export function Button({
  label,
  icon,
  variant = "primary",
  shape = "default",
  size = "default",
  className,
  ...props
}: ButtonProps) {
  const usesLegacyVariant = variant !== "primary";

  return (
    <CanonicalButton
      variant={mapLegacyVariant(variant)}
      leftIcon={icon}
      className={cn(
        usesLegacyVariant && legacyVariantStyles[variant],
        legacyShapeStyles[shape],
        legacySizeStyles[size],
        className,
      )}
      {...props}
    >
      {label}
    </CanonicalButton>
  );
}
