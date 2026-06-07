import { PageHeader } from "@/components/Layouts/PageHeader";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type ToolPageWidth = "md" | "lg" | "xl" | "2xl" | "full";

const widthClass: Record<ToolPageWidth, string> = {
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-5xl",
  "2xl": "max-w-6xl",
  full: "max-w-none",
};

interface ToolPageLayoutProps {
  pageName: string;
  title?: string;
  description?: string;
  children: ReactNode;
  width?: ToolPageWidth;
  className?: string;
  actions?: ReactNode;
}

export function ToolPageLayout({
  pageName,
  title,
  description,
  children,
  width = "lg",
  className,
  actions,
}: ToolPageLayoutProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <PageHeader
        pageName={pageName}
        title={title}
        description={description}
      />
      {actions ? (
        <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>
      ) : null}
      <div className={cn("mx-auto w-full", widthClass[width])}>{children}</div>
    </div>
  );
}
