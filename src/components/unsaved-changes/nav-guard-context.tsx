"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

type Guard = {
  shouldBlock: () => boolean;
  requestNavigate: (href: string) => void;
};

type NavGuardContextValue = {
  register: (guard: Guard | null) => void;
  interceptNavigate: (href: string, event: { preventDefault: () => void }) => void;
};

const NavGuardContext = createContext<NavGuardContextValue | null>(null);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const guardRef = useRef<Guard | null>(null);

  const register = useCallback((guard: Guard | null) => {
    guardRef.current = guard;
  }, []);

  const interceptNavigate = useCallback((href: string, event: { preventDefault: () => void }) => {
    const guard = guardRef.current;
    if (!guard?.shouldBlock()) return;
    const path = href.split("?")[0];
    if (typeof window !== "undefined" && path === window.location.pathname) return;
    event.preventDefault();
    guard.requestNavigate(href);
  }, []);

  const value = useMemo(
    () => ({ register, interceptNavigate }),
    [register, interceptNavigate]
  );

  return <NavGuardContext.Provider value={value}>{children}</NavGuardContext.Provider>;
}

export function useRegisterUnsavedGuard(
  shouldBlock: boolean,
  onBlockedNavigate: (href: string) => void
) {
  const ctx = useContext(NavGuardContext);

  useEffect(() => {
    if (!ctx) return;
    ctx.register({
      shouldBlock: () => shouldBlock,
      requestNavigate: onBlockedNavigate,
    });
    return () => ctx.register(null);
  }, [ctx, shouldBlock, onBlockedNavigate]);
}

export function useUnsavedLinkHandler() {
  const ctx = useContext(NavGuardContext);
  return useCallback(
    (href: string) => (event: { preventDefault: () => void }) => {
      ctx?.interceptNavigate(href, event);
    },
    [ctx]
  );
}
