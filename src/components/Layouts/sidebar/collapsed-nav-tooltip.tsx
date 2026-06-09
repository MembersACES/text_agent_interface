"use client";

import { useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

export function CollapsedNavTooltip({
  label,
  anchorRef,
  open,
}: {
  label: string;
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }

    const el = anchorRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setPos({
        top: rect.top + rect.height / 2,
        left: rect.right + 10,
      });
    };

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [anchorRef, open, label]);

  if (!open || !pos || typeof document === "undefined") return null;

  return createPortal(
    <span
      role="tooltip"
      style={{ top: pos.top, left: pos.left, transform: "translateY(-50%)" }}
      className="pointer-events-none fixed z-[200] whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1 text-xs font-medium text-white shadow-lg dark:bg-gray-100 dark:text-gray-900"
    >
      {label}
    </span>,
    document.body,
  );
}
