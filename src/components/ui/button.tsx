"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef, ReactNode } from "react";
import { Spinner } from "./spinner";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "default" | "lg";
  loading?: boolean;
  leftIcon?: ReactNode;
  children: ReactNode;
}

const variantStyles = {
  primary:
    "bg-primary text-white hover:opacity-90 focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-dark disabled:opacity-50",
  secondary:
    "border border-stroke dark:border-dark-3 bg-white dark:bg-gray-dark text-dark dark:text-white hover:bg-gray dark:hover:bg-dark-3 focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50",
  ghost:
    "bg-transparent text-dark dark:text-white hover:bg-gray/80 dark:hover:bg-dark-3 focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50",
  danger:
    "bg-red text-white hover:opacity-90 focus:ring-2 focus:ring-red focus:ring-offset-2 dark:focus:ring-offset-gray-dark disabled:opacity-50",
};

const sizeStyles = {
  sm: "px-2.5 py-1.5 text-xs rounded-md gap-1.5",
  default: "px-3 py-1.5 text-sm rounded-md gap-2",
  lg: "px-4 py-2 text-base rounded-lg gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "default",
      loading = false,
      disabled,
      leftIcon,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type="button"
        disabled={isDisabled}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-opacity focus:outline-none disabled:cursor-not-allowed",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <Spinner className="size-4 shrink-0" />
        ) : leftIcon ? (
          <span className="shrink-0 [&>svg]:size-4 [&>svg]:size-[1em]">
            {leftIcon}
          </span>
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
