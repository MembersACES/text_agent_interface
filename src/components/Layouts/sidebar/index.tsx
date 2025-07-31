"use client";

import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_DATA, ACES_BRAND } from "./data";
import { ArrowLeftIcon, ChevronUp } from "./icons";
import { MenuItem } from "./menu-item";
import { useSidebarContext } from "./sidebar-context";

export function Sidebar() {
  const pathname = usePathname();
  const { setIsOpen, isOpen, isMobile, toggleSidebar } = useSidebarContext();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) => 
      prev.includes(title) 
        ? prev.filter(item => item !== title)
        : [...prev, title]
    );
  };

  useEffect(() => {
    NAV_DATA.some((section) =>
      section.items.some((item) =>
        item.items.some((subItem) => {
          if (subItem.url === pathname) {
            if (!expandedItems.includes(item.title)) {
              toggleExpanded(item.title);
            }
            return true;
          }
          return false;
        })
      )
    );
  }, [pathname, expandedItems]);

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
          "max-w-[290px] overflow-hidden border-r border-gray-200 bg-white transition-[width] duration-200 ease-linear dark:border-gray-800 dark:bg-gray-dark",
          isMobile ? "fixed bottom-0 top-0 z-50" : "sticky top-0 h-screen",
          isOpen ? "w-full" : "w-0"
        )}
        aria-label="Main navigation"
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        <div className="flex h-full flex-col py-10 pl-[25px] pr-[7px]">
          {/* ACES Logo + Name */}
          <div className="flex flex-col items-center mb-6">
            <a href="/" onClick={() => isMobile && toggleSidebar()} className="block text-center">
              <img
                src={typeof ACES_BRAND.logo === "string" ? ACES_BRAND.logo : ACES_BRAND.logo.src}
                alt="ACES Logo"
                className="h-12 w-auto mb-1"
              />
              <span className="text-base font-semibold text-gray-900 dark:text-white">
                ACES Portal
              </span>
            </a>
          </div>

          {/* Optional mobile close button */}
          {isMobile && (
            <button
              onClick={toggleSidebar}
              className="absolute left-3/4 right-4.5 top-1/2 -translate-y-1/2 text-right"
              aria-label="Close Menu"
            >
              <ArrowLeftIcon className="ml-auto size-7" />
            </button>
          )}

          {/* Navigation */}
          <div className="custom-scrollbar flex-1 overflow-y-auto pr-3 min-[850px]:mt-6">
            {NAV_DATA.map((section) => (
              <div key={section.label} className="mb-6">
                <h2 className="mb-5 text-sm font-medium text-dark-4 dark:text-dark-6">
                  {section.label}
                </h2>

                <nav role="navigation" aria-label={section.label}>
                  <ul className="space-y-2">
                    {section.items.map((item) => (
                      <li key={item.title}>
                        {item.items.length > 0 ? (
                          <>
                            <MenuItem
                              isActive={item.items.some(({ url }) => url === pathname)}
                              onClick={() => toggleExpanded(item.title)}
                              className="flex items-center justify-between"
                            >
                              <div className="flex items-center gap-3">
                                {item.icon && (
                                  <item.icon className="size-6 shrink-0" aria-hidden="true" />
                                )}
                                <span>{item.title}</span>
                              </div>
                              <ChevronUp
                                className={cn(
                                  "ml-auto rotate-180 transition-transform duration-200",
                                  expandedItems.includes(item.title) ? "rotate-0" : ""
                                )}
                                aria-hidden="true"
                              />
                            </MenuItem>

                            {expandedItems.includes(item.title) && (
                              <ul className="ml-9 space-y-1.5 pb-[15px] pt-2" role="menu">
                                {item.items
                                  .filter(
                                    (subItem) =>
                                      subItem &&
                                      typeof subItem.url === "string" &&
                                      subItem.url.length > 0 &&
                                      typeof subItem.title === "string"
                                  )
                                  .map((subItem) => (
                                    <li key={subItem.title} role="none">
                                      <MenuItem
                                        as="link"
                                        href={subItem.url!}
                                        isActive={pathname === subItem.url}
                                        className="block"
                                      >
                                        <span>{subItem.title}</span>
                                      </MenuItem>
                                    </li>
                                  ))}
                              </ul>
                            )}
                          </>
                        ) : (
                          (() => {
                            const href =
                              (item as any).url &&
                              typeof (item as any).url === "string" &&
                              (item as any).url.length > 0
                                ? (item as any).url
                                : "/" + item.title.toLowerCase().replace(/\s+/g, "-");

                            return (
                              <MenuItem
                                className="flex items-center gap-3 py-3"
                                as="link"
                                href={href}
                                isActive={pathname === href}
                              >
                                {item.icon && (
                                  <item.icon className="size-6 shrink-0" aria-hidden="true" />
                                )}
                                <span>{item.title}</span>
                              </MenuItem>
                            );
                          })()
                        )}
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
