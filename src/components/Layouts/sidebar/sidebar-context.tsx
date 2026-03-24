"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import { createContext, useContext, useState } from "react";

const SIDEBAR_COLLAPSED_KEY = "aces-sidebar-collapsed";

type SidebarState = "expanded" | "collapsed";

type SidebarContextType = {
  state: SidebarState;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
  /** Desktop only: icon-only vs expanded sidebar. */
  isCollapsed: boolean;
  toggleCollapse: () => void;
};

const SidebarContext = createContext<SidebarContextType | null>(null);

export function useSidebarContext() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebarContext must be used within a SidebarProvider");
  }
  return context;
}

export function SidebarProvider({
  children,
  defaultOpen = true,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(defaultOpen);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      return stored === "true";
    } catch {
      return false;
    }
  });
  const isMobile = useIsMobile();
  const isOpen = isMobile ? mobileOpen : true;
  const setIsOpen = (open: boolean) => {
    if (isMobile) setMobileOpen(open);
  };

  function toggleSidebar() {
    if (isMobile) setMobileOpen((prev) => !prev);
  }

  function toggleCollapse() {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
        } catch {
          // ignore
        }
      }
      return next;
    });
  }

  return (
    <SidebarContext.Provider
      value={{
        state: isOpen ? "expanded" : "collapsed",
        isOpen,
        setIsOpen,
        isMobile,
        toggleSidebar,
        isCollapsed,
        toggleCollapse,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}
