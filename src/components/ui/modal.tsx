"use client";

import { cn } from "@/lib/utils";
import { ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

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
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    previousActive.current = document.activeElement as HTMLElement | null;
    const overlay = overlayRef.current;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };

    const handleBackdrop = (e: MouseEvent) => {
      if (e.target === overlay) onCloseRef.current();
    };

    document.addEventListener("keydown", handleEscape);
    overlay?.addEventListener("click", handleBackdrop);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus first field when modal opens (don't re-run on every keystroke)
    const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusables?.length) {
      (focusables[0] as HTMLElement).focus();
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      overlay?.removeEventListener("click", handleBackdrop);
      document.body.style.overflow = prevOverflow;
      previousActive.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  // Portal out of layout shells that use `isolate` + `overflow-hidden` (clips fixed modals).
  if (typeof document === "undefined") return null;

  const dialog = (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[99999] flex items-start justify-center overflow-y-auto overscroll-contain p-4"
      aria-hidden={!open}
    >
      <div className="fixed inset-0 bg-black/50 dark:bg-black/60" aria-hidden />
      <div
        ref={panelRef}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? `${id ?? "modal"}-title` : undefined}
        className={cn(
          "relative z-10 my-4 flex w-full flex-col rounded-xl border border-stroke bg-white shadow-4 dark:border-dark-3 dark:bg-gray-dark sm:my-8",
          // Hard viewport cap — avoids flex min-content height blocking scroll
          "max-h-[calc(100dvh-2rem)] overflow-hidden",
          sizeClasses[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="shrink-0 border-b border-stroke px-4 py-3 dark:border-dark-3 sm:px-6">
            <h2
              id={id ? `${id}-title` : "modal-title"}
              className="text-heading-6 font-bold text-dark dark:text-white"
            >
              {title}
            </h2>
          </div>
        )}
        <div
          className="overflow-y-auto overscroll-contain px-4 py-3 sm:px-6 sm:py-4"
          style={{ maxHeight: "calc(100dvh - 11rem)" }}
        >
          {children}
        </div>
        {footer != null && (
          <div className="shrink-0 border-t border-stroke px-4 py-3 dark:border-dark-3 sm:px-6 sm:py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
