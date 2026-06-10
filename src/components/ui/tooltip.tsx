"use client";

import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export interface TooltipProps {
  label: string;
  children: ReactNode;
  /** Preferred placement relative to the trigger. Default: top */
  side?: "top" | "bottom";
  className?: string;
}

export function Tooltip({ label, children, side = "top", className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);

  const updatePosition = () => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (side === "bottom") {
      setPos({ top: rect.bottom + 6, left: rect.left + rect.width / 2 });
    } else {
      setPos({ top: rect.top - 6, left: rect.left + rect.width / 2 });
    }
  };

  const show = () => {
    updatePosition();
    setOpen(true);
  };

  const hide = () => setOpen(false);

  return (
    <>
      <span
        ref={anchorRef}
        className={className ?? "inline-flex"}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocusCapture={show}
        onBlurCapture={hide}
      >
        {children}
      </span>
      {open && pos && typeof document !== "undefined"
        ? createPortal(
            <span
              role="tooltip"
              style={{
                top: pos.top,
                left: pos.left,
                transform: side === "bottom" ? "translate(-50%, 0)" : "translate(-50%, -100%)",
              }}
              className="pointer-events-none fixed z-[200] max-w-[14rem] whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1 text-xs font-medium text-white shadow-lg dark:bg-gray-100 dark:text-gray-900"
            >
              {label}
            </span>,
            document.body
          )
        : null}
    </>
  );
}
