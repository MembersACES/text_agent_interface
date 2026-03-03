import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import Link from "next/link";
import { useSidebarContext } from "./sidebar-context";

const menuItemBaseStyles = cva(
  "rounded-lg font-medium text-dark-4 transition-all duration-200 dark:text-dark-6 relative hover:translate-x-0.5",
  {
    variants: {
      isActive: {
        true:
          "bg-[rgba(87,80,241,0.12)] text-primary hover:bg-[rgba(87,80,241,0.15)] dark:bg-[#FFFFFF1A] dark:text-white before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-6 before:rounded-full before:bg-primary before:rounded-r",
        false:
          "hover:bg-gray-100 hover:text-dark dark:hover:bg-[#FFFFFF1A] dark:hover:text-white",
      },
      isCollapsed: {
        true: "flex items-center justify-center px-2 py-2.5",
        false: "flex items-center gap-3 px-3.5 py-2.5",
      },
    },
    defaultVariants: {
      isActive: false,
      isCollapsed: false,
    },
  },
);

export function MenuItem(
  props: {
    className?: string;
    children: React.ReactNode;
    isActive: boolean;
    /** When true, label is visually hidden but kept for screen readers. */
    isCollapsed?: boolean;
    /** Accessible label for collapsed mode (tooltip / aria-label). */
    label?: string;
  } & (
    | { as?: "button"; onClick: () => void }
    | { as: "link"; href: string }
  ),
) {
  const { toggleSidebar, isMobile, isCollapsed } = useSidebarContext();
  const collapsed = props.isCollapsed ?? isCollapsed;

  const content = (
    <>
      {props.children}
      {collapsed && props.label && (
        <span className="sr-only">{props.label}</span>
      )}
    </>
  );

  if (props.as === "link") {
    return (
      <Link
        href={props.href}
        aria-label={collapsed ? props.label ?? undefined : undefined}
        title={collapsed ? props.label : undefined}
        onClick={() => isMobile && toggleSidebar()}
        className={cn(
          menuItemBaseStyles({
            isActive: props.isActive,
            isCollapsed: collapsed,
            className: "relative block",
          }),
          !collapsed && "py-2.5",
          props.className,
        )}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-expanded={props.as === "button" ? props.isActive : undefined}
      aria-label={collapsed ? props.label ?? undefined : undefined}
      title={collapsed ? props.label : undefined}
      className={cn(
        menuItemBaseStyles({
          isActive: props.isActive,
          isCollapsed: collapsed,
          className: "w-full",
        }),
        props.className,
      )}
    >
      {content}
    </button>
  );
}
