"use client";

import { cn } from "@/lib/utils";
import { forwardRef, InputHTMLAttributes, useId } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
}

const inputBase =
  "w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-dark dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 transition-colors";

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { className, label, error, hint, wrapperClassName, id: idProp, ...props },
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
        <input
          ref={ref}
          id={id}
          aria-invalid={!!error}
          aria-describedby={
            [error && "input-error", hint && "input-hint"].filter(Boolean).join(" ") || undefined
          }
          className={cn(inputBase, error && "border-red focus:border-red focus:ring-red", className)}
          {...props}
        />
        {error && (
          <p id="input-error" className="text-xs text-red" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id="input-hint" className="text-xs text-gray-600 dark:text-gray-400">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
