"use client";

import { useClickOutside } from "@/hooks/use-click-outside";
import { cn } from "@/lib/utils";
import { SetStateActionType } from "@/types/set-state-action-type";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

type DropdownContextType = {
  isOpen: boolean;
  handleOpen: () => void;
  handleClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
};

const DropdownContext = createContext<DropdownContextType | null>(null);

function useDropdownContext() {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error("useDropdownContext must be used within a Dropdown");
  }
  return context;
}

type DropdownProps = {
  children: React.ReactNode;
  isOpen: boolean;
  setIsOpen: SetStateActionType<boolean>;
};

export function Dropdown({ children, isOpen, setIsOpen }: DropdownProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      handleClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.pointerEvents = "none";
    } else {
      document.body.style.removeProperty("pointer-events");
    }
    return () => {
      document.body.style.removeProperty("pointer-events");
    };
  }, [isOpen]);

  function handleClose() {
    setIsOpen(false);
  }

  function handleOpen() {
    setIsOpen(true);
  }

  return (
    <DropdownContext.Provider value={{ isOpen, handleOpen, handleClose, triggerRef }}>
      <div className="relative" onKeyDown={handleKeyDown}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

type DropdownContentProps = {
  align?: "start" | "end" | "center";
  className?: string;
  children: React.ReactNode;
  /** Render menu in a portal with fixed positioning (avoids overflow clipping). Default true. */
  portal?: boolean;
};

export function DropdownContent({
  children,
  align = "center",
  className,
  portal = true,
}: DropdownContentProps) {
  const { isOpen, handleClose, triggerRef } = useDropdownContext();
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const contentRef = useClickOutside<HTMLDivElement>(() => {
    if (isOpen) handleClose();
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen || !portal) {
      setPosition(null);
      return;
    }
    const trigger = triggerRef.current;
    if (!trigger) return;

    const updatePosition = () => {
      const rect = trigger.getBoundingClientRect();
      const menuWidth = 160;
      let left = rect.left;
      if (align === "end") {
        left = rect.right - menuWidth;
      } else if (align === "center") {
        left = rect.left + rect.width / 2 - menuWidth / 2;
      }
      left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));
      setPosition({ top: rect.bottom + 8, left });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, portal, align, triggerRef]);

  if (!isOpen) return null;

  const menuClasses = cn(
    "fade-in-0 zoom-in-95 pointer-events-auto min-w-[8rem] origin-top-right rounded-lg shadow-lg",
    !portal && "absolute z-99 mt-2",
    !portal && {
      "animate-in right-0": align === "end",
      "left-0": align === "start",
      "left-1/2 -translate-x-1/2": align === "center",
    },
    className
  );

  const menu = (
    <div
      ref={contentRef}
      role="menu"
      aria-orientation="vertical"
      className={menuClasses}
      style={
        portal && position
          ? { position: "fixed", top: position.top, left: position.left, zIndex: 9999 }
          : undefined
      }
    >
      {children}
    </div>
  );

  if (portal && mounted) {
    return createPortal(menu, document.body);
  }

  return menu;
}

type DropdownTriggerProps = React.HTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
};

export function DropdownTrigger({ children, className, ...props }: DropdownTriggerProps) {
  const { handleOpen, isOpen, triggerRef } = useDropdownContext();

  return (
    <button
      ref={triggerRef}
      type="button"
      className={className}
      onClick={handleOpen}
      aria-expanded={isOpen}
      aria-haspopup="menu"
      data-state={isOpen ? "open" : "closed"}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownClose({ children }: PropsWithChildren) {
  const { handleClose } = useDropdownContext();

  return <div onClick={handleClose}>{children}</div>;
}
