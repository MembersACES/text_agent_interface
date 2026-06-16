"use client";

import { AppCopyright } from "@/components/Layouts/AppCopyright";
import { BRAND } from "@/lib/brand";
import { getApiBaseUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronLeft, ChevronsLeft, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  JOB_GROUPS,
  MAIN_NAV,
  NAV_DATA,
  PINNED_NAV,
  type NavGroupItem,
  type NavLinkItem,
  type NavSection,
} from "./data";
import { MenuItem } from "./menu-item";
import { navMatchesQuery } from "./nav-utils";
import { useSidebarContext } from "./sidebar-context";

const SECTION_COLLAPSED_KEY_PREFIX = "cza-sidebar-section-";
const JOB_GROUP_COLLAPSED_KEY_PREFIX = "cza-sidebar-job-";
const SIDEBAR_RAIL_WIDTH = 56;
const SIDEBAR_EXPANDED_WIDTH = 260;

function isNavGroup(item: NavLinkItem | NavGroupItem): item is NavGroupItem {
  return "items" in item && Array.isArray((item as NavGroupItem).items);
}

function NavIcon({
  icon: Icon,
  collapsed,
  badge,
}: {
  icon?: NavLinkItem["icon"];
  label: string;
  collapsed: boolean;
  badge?: number;
}) {
  if (!Icon) return null;
  return (
    <span className="relative flex shrink-0">
      <Icon className="size-[18px] shrink-0" aria-hidden />
      {badge != null && badge > 0 && (
        <span
          className="absolute -right-1.5 -top-1 z-[1] flex min-w-4 items-center justify-center rounded-full bg-semantic-block px-0.5 text-[9px] font-bold leading-none text-white ring-2 ring-white dark:ring-gray-dark"
          aria-label={`${badge} pending`}
        >
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </span>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { setIsOpen, isOpen, isMobile, toggleSidebar, isCollapsed, toggleCollapse } =
    useSidebarContext();

  const [jumpQuery, setJumpQuery] = useState("");
  const [invoicingAllowed, setInvoicingAllowed] = useState<boolean | null>(null);
  const [personalAssistantAllowed, setPersonalAssistantAllowed] = useState<boolean | null>(null);
  const [videoAllowed, setVideoAllowed] = useState<boolean | null>(null);
  const [pendingTaskCount, setPendingTaskCount] = useState(0);

  const [sectionOpen, setSectionOpen] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    const initial: Record<string, boolean> = {};
    NAV_DATA.forEach((section) => {
      try {
        const stored = localStorage.getItem(SECTION_COLLAPSED_KEY_PREFIX + section.label);
        initial[section.label] = stored !== "false";
      } catch {
        initial[section.label] = true;
      }
    });
    return initial;
  });

  const [jobGroupOpen, setJobGroupOpen] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    const initial: Record<string, boolean> = {};
    JOB_GROUPS.forEach((group) => {
      try {
        const stored = localStorage.getItem(JOB_GROUP_COLLAPSED_KEY_PREFIX + group.title);
        initial[group.title] = stored === "true";
      } catch {
        initial[group.title] = false;
      }
    });
    return initial;
  });

  const filtering = jumpQuery.trim().length > 0;

  const setSectionExpanded = useCallback((label: string, open: boolean) => {
    setSectionOpen((prev) => ({ ...prev, [label]: open }));
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(SECTION_COLLAPSED_KEY_PREFIX + label, String(open));
      } catch {
        // ignore
      }
    }
  }, []);

  const setJobGroupExpanded = useCallback((title: string, open: boolean) => {
    setJobGroupOpen((prev) => ({ ...prev, [title]: open }));
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(JOB_GROUP_COLLAPSED_KEY_PREFIX + title, String(open));
      } catch {
        // ignore
      }
    }
  }, []);

  const isSectionOpen = useCallback(
    (label: string) => sectionOpen[label] !== false,
    [sectionOpen],
  );
  const isJobGroupOpen = useCallback(
    (title: string) => jobGroupOpen[title] === true,
    [jobGroupOpen],
  );

  useEffect(() => {
    if (filtering) {
      JOB_GROUPS.forEach((group) => {
        const groupMatch = navMatchesQuery(group.title, jumpQuery);
        const childMatch = group.items.some((sub) =>
          navMatchesQuery(sub.title, jumpQuery),
        );
        if (groupMatch || childMatch) {
          setJobGroupExpanded(group.title, true);
        }
      });
      NAV_DATA.forEach((section) => {
        const match = section.items.some((item) => {
          if (isNavGroup(item)) {
            return (
              navMatchesQuery(item.title, jumpQuery) ||
              item.items.some((sub) => navMatchesQuery(sub.title, jumpQuery))
            );
          }
          return navMatchesQuery(item.title, jumpQuery);
        });
        if (match) setSectionExpanded(section.label, true);
      });
    }
  }, [jumpQuery, filtering, setJobGroupExpanded, setSectionExpanded]);

  useEffect(() => {
    NAV_DATA.forEach((section) => {
      section.items.forEach((item) => {
        if (isNavGroup(item)) {
          const hasActive = item.items.some((sub) => sub.url === pathname);
          if (hasActive && !isSectionOpen(section.label)) {
            setSectionExpanded(section.label, true);
          }
        }
      });
    });
    JOB_GROUPS.forEach((group) => {
      const hasActive = group.items.some((sub) => sub.url === pathname);
      if (hasActive && !isJobGroupOpen(group.title)) {
        setJobGroupExpanded(group.title, true);
      }
    });
  }, [pathname, isSectionOpen, isJobGroupOpen, setSectionExpanded, setJobGroupExpanded]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.email) return;

    let cancelled = false;
    (async () => {
      try {
        const [invRes, paRes, vidRes] = await Promise.all([
          fetch("/api/invoicing-access", { method: "GET" }),
          fetch("/api/personal-assistant-access", { method: "GET" }),
          fetch("/api/video-access", { method: "GET" }),
        ]);
        const [invBody, paBody, vidBody] = await Promise.all([
          invRes.json().catch(() => ({})),
          paRes.json().catch(() => ({})),
          vidRes.json().catch(() => ({})),
        ]);
        if (cancelled) return;
        setInvoicingAllowed(Boolean((invBody as { allowed?: boolean }).allowed));
        setPersonalAssistantAllowed(
          Boolean((paBody as { allowed?: boolean }).allowed),
        );
        setVideoAllowed(Boolean((vidBody as { allowed?: boolean }).allowed));
      } catch {
        if (!cancelled) {
          setInvoicingAllowed(false);
          setPersonalAssistantAllowed(false);
          setVideoAllowed(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, session?.user?.email]);

  useEffect(() => {
    const token =
      (session as { id_token?: string; accessToken?: string })?.id_token ??
      (session as { id_token?: string; accessToken?: string })?.accessToken;
    if (!token) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/tasks/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const count = (Array.isArray(data) ? data : []).filter(
          (t: { status?: string }) =>
            !["completed", "cancelled"].includes(String(t.status).toLowerCase()),
        ).length;
        if (!cancelled) setPendingTaskCount(count);
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session]);

  const hasInvoicingAccess = invoicingAllowed === true;
  const hasPersonalAssistantAccess = personalAssistantAllowed === true;
  const hasVideoAccess = videoAllowed === true;

  function canSeeRestrictedNavUrl(url: string): boolean {
    if (url === "/invoicing") return hasInvoicingAccess;
    if (url === "/personal-assistant") return hasPersonalAssistantAccess;
    if (url === "/videos") return hasVideoAccess;
    return true;
  }

  function itemVisible(title: string, url?: string): boolean {
    if (!filtering) return true;
    if (navMatchesQuery(title, jumpQuery)) return true;
    if (url && navMatchesQuery(url.replace(/\//g, " "), jumpQuery)) return true;
    return false;
  }

  function itemHighlight(title: string): boolean {
    return filtering && navMatchesQuery(title, jumpQuery);
  }

  const sections = useMemo(
    () =>
      NAV_DATA.map((section) => ({
        ...section,
        items: section.items
          .map((item) => {
            if (isNavGroup(item)) {
              return {
                ...item,
                items: item.items.filter((sub) => canSeeRestrictedNavUrl(sub.url)),
              };
            }
            if (!canSeeRestrictedNavUrl(item.url)) return null;
            return item;
          })
          .filter((item): item is NavLinkItem | NavGroupItem => Boolean(item)),
      })).filter(
        (section) =>
          (section.label !== "Development" || process.env.NODE_ENV !== "production") &&
          section.items.length > 0,
      ),
    [hasInvoicingAccess, hasPersonalAssistantAccess, hasVideoAccess],
  );

  const filteredJobGroups = useMemo(
    () =>
      JOB_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((sub) => canSeeRestrictedNavUrl(sub.url)),
      })).filter((g) => g.items.length > 0),
    [hasInvoicingAccess, hasPersonalAssistantAccess, hasVideoAccess],
  );

  const renderLink = (item: NavLinkItem, badge?: number) => {
    if (!itemVisible(item.title, item.url)) return null;
    const href = item.url || "/";
    const active = pathname === href;
    const showBadge = badge ?? (item.url === "/tasks" ? pendingTaskCount : 0);

    return (
      <li key={item.title} className={cn(isCollapsed && "flex w-full justify-center")}>
        <MenuItem
          as="link"
          href={href}
          isActive={active}
          isHighlighted={itemHighlight(item.title)}
          label={item.title}
          className="flex w-full items-center gap-2.5"
        >
          <NavIcon
            icon={item.icon}
            label={item.title}
            collapsed={isCollapsed}
            badge={isCollapsed && showBadge > 0 ? showBadge : undefined}
          />
          {!isCollapsed && (
            <>
              <span className="min-w-0 flex-1 truncate">{item.title}</span>
              {showBadge > 0 && (
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-semantic-block text-[10px] font-bold tabular-nums text-white">
                  {showBadge > 9 ? "9+" : showBadge}
                </span>
              )}
            </>
          )}
        </MenuItem>
      </li>
    );
  };

  const renderSection = (section: NavSection) => {
    const visibleItems = section.items.filter((item) => {
      if (isNavGroup(item)) {
        return (
          itemVisible(item.title) ||
          item.items.some((sub) => itemVisible(sub.title, sub.url))
        );
      }
      return itemVisible(item.title, item.url);
    });
    if (visibleItems.length === 0) return null;

    const open = isSectionOpen(section.label);

    return (
      <div key={section.label} className={cn("mb-2", isCollapsed && "flex flex-col items-center")}>
        {!isCollapsed && (
          <button
            type="button"
            onClick={() => setSectionExpanded(section.label, !open)}
            className="flex w-full min-h-[28px] items-center justify-between gap-2 rounded-md px-3 py-1 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500 transition-colors hover:bg-primary/5 hover:text-primary dark:text-gray-400"
            aria-expanded={open}
          >
            <span>{section.label}</span>
            <ChevronDown
              className={cn("size-3.5 shrink-0 transition-transform", !open && "-rotate-90")}
              aria-hidden
            />
          </button>
        )}

        {(open || isCollapsed) && (
          <ul className={cn("space-y-0.5", isCollapsed && "flex flex-col items-center")}>
            {visibleItems.map((item) => {
              if (isNavGroup(item)) {
                const hasActive = item.items.some((sub) => sub.url === pathname);
                return (
                  <li key={item.title} className="w-full">
                    {!isCollapsed && (
                      <MenuItem
                        isActive={hasActive}
                        onClick={() => setSectionExpanded(section.label, !open)}
                        label={item.title}
                        isHighlighted={itemHighlight(item.title)}
                        className="flex items-center gap-2.5"
                      >
                        <NavIcon icon={item.icon} label={item.title} collapsed={false} />
                        <span className="flex-1 truncate text-left">{item.title}</span>
                        <ChevronDown
                          className={cn(
                            "size-3.5 shrink-0 text-gray-400 transition-transform",
                            !open && "-rotate-90",
                          )}
                          aria-hidden
                        />
                      </MenuItem>
                    )}
                    {open && !isCollapsed && (
                      <ul className="ml-7 space-y-0.5 pb-1">
                        {item.items
                          .filter((sub) => itemVisible(sub.title, sub.url))
                          .map((sub) => (
                            <li key={sub.title}>
                              <MenuItem
                                as="link"
                                href={sub.url}
                                isActive={pathname === sub.url}
                                isHighlighted={itemHighlight(sub.title)}
                                label={sub.title}
                              >
                                <span className="truncate">{sub.title}</span>
                              </MenuItem>
                            </li>
                          ))}
                      </ul>
                    )}
                  </li>
                );
              }
              return renderLink(item as NavLinkItem);
            })}
          </ul>
        )}
      </div>
    );
  };

  const sidebarWidth = isMobile
    ? isOpen
      ? SIDEBAR_EXPANDED_WIDTH
      : 0
    : isCollapsed
      ? SIDEBAR_RAIL_WIDTH
      : SIDEBAR_EXPANDED_WIDTH;

  return (
    <>
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden
        />
      )}

      <aside
        style={{ width: sidebarWidth }}
        className={cn(
          "shrink-0 border-r border-gray-200 bg-white transition-[width] duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-dark",
          "overflow-hidden",
          isMobile ? "fixed bottom-0 top-0 z-50" : "sticky top-0 h-screen",
        )}
        aria-label="Main navigation"
        aria-hidden={isMobile ? !isOpen : false}
        inert={isMobile && !isOpen ? true : undefined}
      >
        <div className="flex h-full flex-col">
          {/* Logo — 64px to align with header */}
          <div
            className={cn(
              "flex h-16 shrink-0 items-center border-b border-stroke dark:border-dark-3",
              isCollapsed ? "justify-center px-2" : "px-4",
            )}
          >
            <Link
              href="/"
              onClick={() => isMobile && toggleSidebar()}
              className={cn(
                "flex min-w-0 items-center gap-2.5",
                isCollapsed ? "justify-center" : "",
              )}
              aria-label={`${BRAND.portalName} home`}
            >
              {isCollapsed ? (
                <Image
                  src={BRAND.logo}
                  alt=""
                  width={32}
                  height={32}
                  className="size-8 object-contain"
                />
              ) : (
                <>
                  <Image
                    src={BRAND.logo}
                    alt={`${BRAND.name} logo`}
                    width={32}
                    height={32}
                    className="size-8 shrink-0 object-contain"
                  />
                  <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                    {BRAND.portalName}
                  </span>
                </>
              )}
            </Link>

            {isMobile && (
              <button
                type="button"
                onClick={toggleSidebar}
                className="absolute right-3 top-5 text-gray-500"
                aria-label="Close menu"
              >
                <ChevronLeft className="size-6" aria-hidden />
              </button>
            )}
          </div>

          {/* Jump to */}
          {!isCollapsed && (
            <div className="shrink-0 border-b border-stroke px-3 py-2 dark:border-dark-3">
              <label className="relative block">
                <span className="sr-only">Jump to page</span>
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gray-400"
                  aria-hidden
                />
                <input
                  type="search"
                  value={jumpQuery}
                  onChange={(e) => setJumpQuery(e.target.value)}
                  placeholder="Jump to…"
                  className="h-[34px] w-full rounded-lg border border-stroke bg-gray/30 pl-8 pr-2 text-sm text-dark outline-none placeholder:text-gray-400 focus:border-primary/40 focus:ring-1 focus:ring-primary/20 dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                />
              </label>
            </div>
          )}

          <div className="custom-scrollbar flex-1 overflow-y-auto px-2 py-2">
            {/* Pinned */}
            {!isCollapsed && (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
                Pinned
              </p>
            )}
            <ul className={cn("mb-3 space-y-0.5", isCollapsed && "flex flex-col items-center")}>
              {PINNED_NAV.map((item) => renderLink(item))}
            </ul>

            {/* Main */}
            {!isCollapsed && (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
                Main
              </p>
            )}
            <ul className={cn("mb-3 space-y-0.5", isCollapsed && "flex flex-col items-center")}>
              {MAIN_NAV.map((item) => renderLink(item))}
            </ul>

            {/* Job groups */}
            {filteredJobGroups.map((group) => {
              const groupVisible =
                itemVisible(group.title) ||
                group.items.some((sub) => itemVisible(sub.title, sub.url));
              if (!groupVisible) return null;

              const open = isJobGroupOpen(group.title) || filtering;
              const hasActive = group.items.some((sub) => sub.url === pathname);

              return (
                <div key={group.title} className="mb-1">
                  <MenuItem
                    as="button"
                    onClick={() => setJobGroupExpanded(group.title, !open)}
                    isActive={hasActive}
                    isHighlighted={itemHighlight(group.title)}
                    label={group.title}
                    className={cn("flex w-full items-center gap-2.5", isCollapsed && "justify-center")}
                  >
                    <NavIcon icon={group.icon} label={group.title} collapsed={isCollapsed} />
                    {!isCollapsed && (
                      <>
                        <span className="min-w-0 flex-1 truncate text-left">{group.title}</span>
                        <ChevronDown
                          className={cn(
                            "size-3.5 shrink-0 text-gray-400 transition-transform",
                            !open && "-rotate-90",
                          )}
                          aria-hidden
                        />
                      </>
                    )}
                  </MenuItem>
                  {open && !isCollapsed && (
                    <ul className="ml-7 space-y-0.5 pb-1 pt-0.5">
                      {group.items
                        .filter((sub) => itemVisible(sub.title, sub.url))
                        .map((sub) => (
                          <li key={sub.url}>
                            <MenuItem
                              as="link"
                              href={sub.url}
                              isActive={pathname === sub.url}
                              isHighlighted={itemHighlight(sub.title)}
                              label={sub.title}
                            >
                              <span className="truncate">{sub.title}</span>
                            </MenuItem>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              );
            })}

            {sections.map(renderSection)}
          </div>

          {/* Footer */}
          <div
            className={cn(
              "shrink-0 border-t border-stroke px-2 py-2 dark:border-dark-3",
              isCollapsed && "flex flex-col items-center",
            )}
          >
            {!isMobile && (
              <button
                type="button"
                onClick={toggleCollapse}
                className={cn(
                  "flex min-h-[34px] w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray/50 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white",
                  isCollapsed && "w-auto justify-center px-2",
                )}
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse to icons"}
              >
                <ChevronsLeft
                  className={cn("size-4 shrink-0 transition-transform", isCollapsed && "rotate-180")}
                  aria-hidden
                />
                {!isCollapsed && <span>Collapse to icons</span>}
              </button>
            )}
            {!isCollapsed && (
              <AppCopyright className="mt-1 px-1 text-center text-[10px] leading-snug text-gray-400 dark:text-gray-500" />
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
