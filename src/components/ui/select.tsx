"use client";

import { cn } from "@/lib/utils";
import {
  forwardRef,
  SelectHTMLAttributes,
  ReactNode,
  useId,
} from "react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
  children: ReactNode;
}

const selectBase =
  "w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-dark dark:text-white focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 transition-colors appearance-none bg-no-repeat bg-[length:1rem] bg-[right_0.5rem_center] pr-9";

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      hint,
      wrapperClassName,
      id: idProp,
      children,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;

    return (
      <div className={cn("space-y-1", wrapperClassName)}>
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-dark dark:text-white"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={id}
            aria-invalid={!!error}
            aria-describedby={
              [error && "select-error", hint && "select-hint"]
                .filter(Boolean)
                .join(" ") || undefined
            }
            className={cn(
              selectBase,
              error && "border-red focus:border-red focus:ring-red",
              className
            )}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            }}
            {...props}
          >
            {children}
          </select>
        </div>
        {error && (
          <p id="select-error" className="text-xs text-red" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id="select-hint" className="text-xs text-gray-600 dark:text-gray-400">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
