"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  const pathname = usePathname();

  // Auto-generate breadcrumbs from pathname if items not provided
  const breadcrumbItems: BreadcrumbItem[] =
    items ||
    pathname
      .split("/")
      .filter(Boolean)
      .map((segment, index, array) => {
        const href = "/" + array.slice(0, index + 1).join("/");
        const label =
          segment.charAt(0).toUpperCase() +
          segment.slice(1).replace(/-/g, " ");
        return { label, href };
      });

  // Add "Home" as first item
  const allItems: BreadcrumbItem[] = [
    { label: "Home", href: "/" },
    ...breadcrumbItems,
  ];

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center space-x-2 text-sm", className)}
    >
      <ol className="flex items-center space-x-2">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          return (
            <li key={item.href || item.label} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="mx-2 h-4 w-4 text-gray-400" />
              )}
              {isLast || !item.href ? (
                <span
                  className={cn(
                    "font-medium",
                    isLast
                      ? "text-dark dark:text-white"
                      : "text-gray-600 dark:text-gray-400"
                  )}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-gray-600 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

