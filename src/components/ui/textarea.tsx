"use client";

import { cn } from "@/lib/utils";
import { forwardRef, TextareaHTMLAttributes, useId } from "react";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
}

const textareaBase =
  "w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-dark dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 transition-colors min-h-[80px] py-2 px-3 resize-y";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
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
        <textarea
          ref={ref}
          id={id}
          aria-invalid={!!error}
          aria-describedby={
            [error && "textarea-error", hint && "textarea-hint"]
              .filter(Boolean)
              .join(" ") || undefined
          }
          className={cn(
            textareaBase,
            error && "border-red focus:border-red focus:ring-red",
            className
          )}
          {...props}
        />
        {error && (
          <p id="textarea-error" className="text-xs text-red" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p
            id="textarea-hint"
            className="text-xs text-gray-600 dark:text-gray-400"
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
