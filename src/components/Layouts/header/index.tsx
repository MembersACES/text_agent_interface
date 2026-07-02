"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebarContext } from "../sidebar/sidebar-context";
import { BRAND } from "@/lib/brand";
import { getTitleForPath } from "@/lib/route-titles";
import { MenuIcon } from "./icons";
import { Notification } from "./notification";
import { ThemeToggleSwitch } from "./theme-toggle";
import { UserInfo } from "./user-info";
import { useCommandPalette } from "@/components/CommandPaletteContext";
import { ChevronRight, Search } from "lucide-react";

export function Header() {
  const pathname = usePathname();
  const { toggleSidebar, toggleCollapse, isMobile, isCollapsed } = useSidebarContext();
  const pageTitle = getTitleForPath(pathname ?? "/");
  const palette = useCommandPalette();
  const isHome = pathname === "/";

  const handleSidebarToggle = () => {
    if (isMobile) {
      toggleSidebar();
    } else {
      toggleCollapse();
    }
  };

  const sidebarToggleLabel = isMobile
    ? "Toggle sidebar"
    : isCollapsed
      ? "Expand sidebar"
      : "Collapse sidebar";

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-stroke bg-white/95 px-4 shadow-1 backdrop-blur-sm dark:border-stroke-dark dark:bg-gray-dark/95 md:px-5 2xl:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={handleSidebarToggle}
          className="flex size-9 items-center justify-center rounded-lg border transition-all duration-200 dark:hover:bg-white/10 active:scale-95 dark:border-stroke-dark dark:bg-gray-dark"
          aria-label={sidebarToggleLabel}
        >
          <MenuIcon />
        </button>

        {isMobile && (
          <Link href="/" className="max-[430px]:hidden min-[375px]:block">
            <Image
              src={BRAND.logo}
              width={28}
              height={28}
              alt=""
              role="presentation"
              className="size-7 object-contain"
            />
          </Link>
        )}

        <nav aria-label="Breadcrumb" className="hidden min-w-0 sm:block">
          <ol className="flex items-center gap-1.5 text-sm">
            <li>
              <Link
                href="/"
                className="font-medium text-gray-500 transition-colors hover:text-primary dark:text-gray-400"
              >
                Dashboard
              </Link>
            </li>
            {!isHome && (
              <>
                <li aria-hidden>
                  <ChevronRight className="size-3.5 text-gray-400" />
                </li>
                <li>
                  <span
                    className="truncate font-semibold text-dark dark:text-white"
                    aria-current="page"
                  >
                    {pageTitle}
                  </span>
                </li>
              </>
            )}
          </ol>
        </nav>
      </div>

      <div className="flex h-9 items-center gap-1.5 min-[375px]:gap-2">
        <button
          type="button"
          onClick={() => palette?.toggle()}
          className="flex h-9 items-center gap-2 rounded-full border border-stroke px-2.5 text-sm text-gray-600 transition-colors hover:bg-gray/50 dark:border-dark-3 dark:text-gray-400 dark:hover:bg-dark-3"
          title="Search and quick actions (Ctrl+K)"
        >
          <Search className="size-4" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden rounded bg-gray-2 px-1.5 py-0.5 font-mono text-xs dark:bg-dark-3 sm:inline">
            ⌘K
          </kbd>
        </button>
        <ThemeToggleSwitch />
        <Notification />
        <UserInfo />
      </div>
    </header>
  );
}
