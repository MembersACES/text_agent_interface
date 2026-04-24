"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronLeft } from "lucide-react";
import { useSession } from "next-auth/react";
import { NAV_DATA, ACES_BRAND } from "./data";
import type { NavGroupItem, NavLinkItem } from "./data";
import { MenuItem } from "./menu-item";
import { useSidebarContext } from "./sidebar-context";
import { canAccessInvoicing } from "@/lib/invoicing-access";

const SECTION_COLLAPSED_KEY_PREFIX = "aces-sidebar-section-";

function isNavGroup(item: NavLinkItem | NavGroupItem): item is NavGroupItem {
  return "items" in item && Array.isArray((item as NavGroupItem).items);
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { setIsOpen, isOpen, isMobile, toggleSidebar, isCollapsed } = useSidebarContext();
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

  const isSectionOpen = useCallback((label: string) => sectionOpen[label] !== false, [sectionOpen]);
  const toggleSection = (label: string) =>
    setSectionExpanded(label, !isSectionOpen(label));

  useEffect(() => {
    NAV_DATA.some((section) =>
      section.items.some((item) => {
        if (isNavGroup(item)) {
          const hasActive = item.items.some((sub) => sub.url === pathname);
          if (hasActive && !isSectionOpen(section.label)) {
            setSectionExpanded(section.label, true);
          }
          return hasActive;
        }
        return false;
      }),
    );
  }, [pathname, isSectionOpen, setSectionExpanded]);

  const userEmail = session?.user?.email ?? null;
  const hasInvoicingAccess = canAccessInvoicing(userEmail);
  const sections = NAV_DATA
    .map((section) => ({
      ...section,
      items: section.items
        .map((item) => {
          if (isNavGroup(item)) {
            return {
              ...item,
              items: item.items.filter((sub) =>
                sub.url === "/robot-dashboard/invoicing" ? hasInvoicingAccess : true
              ),
            };
          }
          if (item.url === "/robot-dashboard/invoicing" && !hasInvoicingAccess) return null;
          return item;
        })
        .filter((item): item is NavLinkItem | NavGroupItem => Boolean(item)),
    }))
    .filter((section) =>
      (section.label !== "Development" || process.env.NODE_ENV !== "production") &&
      section.items.length > 0
    );

  return (
    <>
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "overflow-hidden border-r border-gray-200 bg-white transition-[width] duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-dark",
          isMobile ? "fixed bottom-0 top-0 z-50" : "sticky top-0 h-screen",
          isMobile ? (isOpen ? "w-full max-w-[290px]" : "w-0") : isCollapsed ? "w-[72px]" : "w-[290px]",
        )}
        aria-label="Main navigation"
        aria-hidden={isMobile ? !isOpen : false}
        inert={isMobile && !isOpen ? true : undefined}
      >
        <div
          className={cn(
            "flex h-full flex-col py-6 pl-3 pr-2 min-[850px]:pl-4",
            isCollapsed && "items-center",
          )}
        >
          {/* Logo */}
          <div className={cn("flex flex-col items-center mb-4", isCollapsed ? "w-full" : "")}>
            <Link
              href="/"
              onClick={() => isMobile && toggleSidebar()}
              className="block text-center"
              aria-label="ACES Portal home"
            >
              {isCollapsed ? (
                <Image
                  src="/images/logo/logo-icon.svg"
                  alt=""
                  width={36}
                  height={36}
                  className="h-9 w-9 object-contain"
                />
              ) : (
                <>
                  <Image
                    src={ACES_BRAND.logo}
                    alt="ACES Logo"
                    width={120}
                    height={56}
                    className="h-14 w-auto mb-1"
                  />
                  <span className="text-base font-semibold text-gray-900 dark:text-white">
                    ACES Portal
                  </span>
                </>
              )}
            </Link>
          </div>

          {isMobile && (
            <button
              onClick={toggleSidebar}
              className="absolute left-3/4 right-4.5 top-1/2 -translate-y-1/2 text-right"
              aria-label="Close Menu"
            >
              <ChevronLeft className="ml-auto size-7" aria-hidden />
            </button>
          )}

          <div className="custom-scrollbar flex-1 overflow-y-auto min-[850px]:mt-2">
            {sections.map((section) => {
              const open = isSectionOpen(section.label);
              return (
                <div
                  key={section.label}
                  className={cn(
                    "mb-4",
                    isCollapsed && "flex flex-col items-center",
                  )}
                >
                  {!isCollapsed && (
                    <button
                      type="button"
                      onClick={() => toggleSection(section.label)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-3.5 py-2 text-left text-xs font-semibold uppercase tracking-wider text-dark-4 dark:text-dark-6 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
                      aria-expanded={open}
                      aria-controls={`sidebar-section-${section.label}`}
                      id={`sidebar-section-btn-${section.label}`}
                    >
                      <span>{section.label}</span>
                      <ChevronDown
                        className={cn(
                          "size-4 shrink-0 transition-transform duration-200",
                          !open && "-rotate-90",
                        )}
                        aria-hidden
                      />
                    </button>
                  )}

                  <div
                    id={`sidebar-section-${section.label}`}
                    role="region"
                    aria-labelledby={isCollapsed ? undefined : `sidebar-section-btn-${section.label}`}
                    className="grid transition-[grid-template-rows] duration-200 ease-out"
                    style={{
                      gridTemplateRows: open || isCollapsed ? "1fr" : "0fr",
                    }}
                  >
                    <div className="overflow-hidden">
                      <nav role="navigation" aria-label={section.label}>
                        <ul className={cn("space-y-0.5", isCollapsed && "flex flex-col items-center")}>
                          {section.items.map((item) => {
                            if (isNavGroup(item)) {
                              const expanded = open;
                              const hasActive = item.items.some(
                                (sub) => sub.url === pathname,
                              );
                              return (
                                <li key={item.title} className="w-full">
                                  <MenuItem
                                    isActive={hasActive}
                                    onClick={() => toggleSection(section.label)}
                                    label={item.title}
                                    className={cn(
                                      "flex items-center gap-3",
                                      isCollapsed && "justify-center",
                                    )}
                                  >
                                    {"icon" in item && item.icon && (
                                      <span className="group relative flex shrink-0">
                                        <item.icon
                                          className="size-5 shrink-0"
                                          aria-hidden
                                        />
                                        {isCollapsed && (
                                          <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 shadow transition-opacity duration-150 group-hover:opacity-100 dark:bg-gray-100 dark:text-gray-900">
                                            {item.title}
                                          </span>
                                        )}
                                      </span>
                                    )}
                                    {!isCollapsed && <span>{item.title}</span>}
                                  </MenuItem>
                                  {expanded && !isCollapsed && (
                                    <ul
                                      className={cn(
                                        "space-y-0.5 pb-2 pt-1",
                                        !isCollapsed && "ml-9",
                                      )}
                                      role="menu"
                                    >
                                      {item.items
                                        .filter(
                                          (sub) =>
                                            sub?.url &&
                                            typeof sub.url === "string" &&
                                            typeof sub.title === "string",
                                        )
                                        .map((sub) => (
                                          <li key={sub.title} role="none" className={cn(isCollapsed && "flex justify-center")}>
                                            <MenuItem
                                              as="link"
                                              href={sub.url!}
                                              isActive={pathname === sub.url}
                                              label={sub.title}
                                              className="block"
                                            >
                                              {!isCollapsed && (
                                                <span>{sub.title}</span>
                                              )}
                                            </MenuItem>
                                          </li>
                                        ))}
                                    </ul>
                                  )}
                                </li>
                              );
                            }

                            const linkItem = item as NavLinkItem;
                            const href =
                              linkItem.url && linkItem.url.length > 0
                                ? linkItem.url
                                : "/" +
                                  linkItem.title
                                    .toLowerCase()
                                    .replace(/\s+/g, "-");

                            return (
                              <li key={linkItem.title} className={cn(isCollapsed && "flex justify-center w-full")}>
                                <MenuItem
                                  as="link"
                                  href={href}
                                  isActive={pathname === href}
                                  label={linkItem.title}
                                  className="flex items-center gap-3"
                                >
                                  {linkItem.icon && (
                                    <span className="group relative flex shrink-0">
                                      <linkItem.icon
                                        className="size-5 shrink-0"
                                        aria-hidden
                                      />
                                      {isCollapsed && (
                                        <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 shadow transition-opacity duration-150 group-hover:opacity-100 dark:bg-gray-100 dark:text-gray-900">
                                          {linkItem.title}
                                        </span>
                                      )}
                                    </span>
                                  )}
                                  {!isCollapsed && (
                                    <span>{linkItem.title}</span>
                                  )}
                                </MenuItem>
                              </li>
                            );
                          })}
                        </ul>
                      </nav>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}
