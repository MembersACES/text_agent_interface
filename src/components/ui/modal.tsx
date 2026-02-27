"use client";

import { cn } from "@/lib/utils";
import { HTMLAttributes, ReactNode, useEffect, useRef } from "react";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "default" | "lg";
  className?: string;
  /** Optional id for the dialog element */
  id?: string;
}

const sizeClasses = {
  sm: "max-w-sm",
  default: "max-w-md",
  lg: "max-w-lg",
};

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "default",
  className,
  id,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousActive = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousActive.current = document.activeElement as HTMLElement | null;
    const overlay = overlayRef.current;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    const handleBackdrop = (e: MouseEvent) => {
      if (e.target === overlay) onClose();
    };

    document.addEventListener("keydown", handleEscape);
    overlay?.addEventListener("click", handleBackdrop);
    document.body.style.overflow = "hidden";

    // Focus trap: focus first focusable in panel
    const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusables?.length) {
      (focusables[0] as HTMLElement).focus();
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      overlay?.removeEventListener("click", handleBackdrop);
      document.body.style.removeProperty("overflow");
      previousActive.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-9999 flex items-center justify-center p-4"
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/60"
        aria-hidden
      />
      <div
        ref={panelRef}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? `${id ?? "modal"}-title` : undefined}
        className={cn(
          "relative z-10 w-full rounded-xl border border-stroke bg-white shadow-4 dark:border-dark-3 dark:bg-gray-dark",
          sizeClasses[size],
          className
        )}
      >
        {title && (
          <div className="border-b border-stroke px-4 py-3 dark:border-dark-3 sm:px-6">
            <h2
              id={id ? `${id}-title` : "modal-title"}
              className="text-heading-6 font-bold text-dark dark:text-white"
            >
              {title}
            </h2>
          </div>
        )}
        <div className="px-4 py-3 sm:px-6 sm:py-4">{children}</div>
        {footer != null && (
          <div className="border-t border-stroke px-4 py-3 dark:border-dark-3 sm:px-6 sm:py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
