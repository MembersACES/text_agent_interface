import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import Link from "next/link";
import { useRef, useState } from "react";
import { CollapsedNavTooltip } from "./collapsed-nav-tooltip";
import { useSidebarContext } from "./sidebar-context";

const menuItemBaseStyles = cva(
  "rounded-lg text-sm font-medium text-dark-4 transition-all duration-200 dark:text-dark-6 relative min-h-[34px]",
  {
    variants: {
      isActive: {
        true:
          "bg-primary/10 text-primary hover:bg-primary/15 dark:bg-white/10 dark:text-white before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-5 before:rounded-full before:bg-primary before:rounded-r",
        false:
          "hover:bg-gray-100 hover:text-dark dark:hover:bg-white/10 dark:hover:text-white",
      },
      isCollapsed: {
        true: "flex items-center justify-center px-1.5 py-1.5",
        false: "flex items-center gap-2.5 px-3 py-1.5",
      },
      isDimmed: {
        true: "opacity-35 pointer-events-none",
        false: "",
      },
      isHighlighted: {
        true: "ring-1 ring-primary/40 bg-primary/5",
        false: "",
      },
    },
    defaultVariants: {
      isActive: false,
      isCollapsed: false,
      isDimmed: false,
      isHighlighted: false,
    },
  },
);

export function MenuItem(
  props: {
    className?: string;
    children: React.ReactNode;
    isActive: boolean;
    isCollapsed?: boolean;
    isDimmed?: boolean;
    isHighlighted?: boolean;
    label?: string;
  } & (
    | { as?: "button"; onClick: () => void }
    | { as: "link"; href: string }
  ),
) {
  const { toggleSidebar, isMobile, isCollapsed } = useSidebarContext();
  const collapsed = props.isCollapsed ?? isCollapsed;
  const itemRef = useRef<HTMLAnchorElement | HTMLButtonElement>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const content = (
    <>
      {props.children}
      {collapsed && props.label && (
        <span className="sr-only">{props.label}</span>
      )}
    </>
  );

  const className = cn(
    menuItemBaseStyles({
      isActive: props.isActive,
      isCollapsed: collapsed,
      isDimmed: props.isDimmed,
      isHighlighted: props.isHighlighted,
    }),
    props.className,
  );

  const hoverHandlers =
    collapsed && props.label
      ? {
          onMouseEnter: () => setShowTooltip(true),
          onMouseLeave: () => setShowTooltip(false),
          onFocus: () => setShowTooltip(true),
          onBlur: () => setShowTooltip(false),
        }
      : {};

  const tooltip =
    collapsed && props.label ? (
      <CollapsedNavTooltip
        label={props.label}
        anchorRef={itemRef}
        open={showTooltip}
      />
    ) : null;

  if (props.as === "link") {
    return (
      <>
        <Link
          ref={itemRef as React.RefObject<HTMLAnchorElement>}
          href={props.href}
          aria-label={collapsed ? props.label ?? undefined : undefined}
          onClick={() => isMobile && toggleSidebar()}
          className={className}
          {...hoverHandlers}
        >
          {content}
        </Link>
        {tooltip}
      </>
    );
  }

  return (
    <>
      <button
        ref={itemRef as React.RefObject<HTMLButtonElement>}
        type="button"
        onClick={props.onClick}
        aria-expanded={props.as === "button" ? props.isActive : undefined}
        aria-label={collapsed ? props.label ?? undefined : undefined}
        className={cn(className, "w-full")}
        {...hoverHandlers}
      >
        {content}
      </button>
      {tooltip}
    </>
  );
}
