"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebarContext } from "../sidebar/sidebar-context";
import { getTitleForPath } from "@/lib/route-titles";
import { MenuIcon } from "./icons";
import { Notification } from "./notification";
import { ThemeToggleSwitch } from "./theme-toggle";
import { UserInfo } from "./user-info";
import { useCommandPalette } from "@/components/CommandPaletteContext";
import { Search } from "lucide-react";

export function Header() {
  const pathname = usePathname();
  const { toggleSidebar, isMobile } = useSidebarContext();
  const pageTitle = getTitleForPath(pathname ?? "/");
  const palette = useCommandPalette();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-stroke bg-white px-4 py-5 shadow-1 dark:border-stroke-dark dark:bg-gray-dark md:px-5 2xl:px-10">
      <button
        onClick={toggleSidebar}
        className="rounded-lg border px-1.5 py-1 dark:border-stroke-dark dark:bg-gray-dark hover:dark:bg-[#FFFFFF1A] transition-all duration-200 active:scale-95"
      >
        <MenuIcon />
        <span className="sr-only">Toggle Sidebar</span>
      </button>

      {isMobile && (
        <Link href={"/"} className="ml-2 max-[430px]:hidden min-[375px]:ml-4">
          <Image
            src={"/images/logo/logo-icon.svg"}
            width={32}
            height={32}
            alt=""
            role="presentation"
          />
        </Link>
      )}

      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="mb-0.5 text-heading-5 font-bold text-dark dark:text-white">
            {pageTitle}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">ACES Admin Dashboard Solution</p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 min-[375px]:gap-4">
        <button
          type="button"
          onClick={() => palette?.toggle()}
          className="flex items-center gap-2 rounded-lg border border-stroke dark:border-stroke-dark px-2.5 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Search clients and offers (Ctrl+K)"
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-xs font-mono">⌘K</kbd>
        </button>
        <ThemeToggleSwitch />

        <Notification />

        <div className="shrink-0">
          <UserInfo />
        </div>
      </div>
    </header>
  );
}
