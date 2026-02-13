import { cn } from "@/lib/utils";
import { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: "default" | "glass" | "elevated";
  hover?: boolean;
}

export function Card({
  children,
  className,
  variant = "default",
  hover = false,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark",
        variant === "glass" &&
          "backdrop-blur-lg bg-white/80 dark:bg-gray-dark/80 border-white/20",
        variant === "elevated" && "shadow-1",
        hover &&
          "transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/20",
        "p-4 sm:p-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardHeader({ children, className, ...props }: CardHeaderProps) {
  return (
    <div className={cn("mb-4", className)} {...props}>
      {children}
    </div>
  );
}

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
}

export function CardTitle({
  children,
  className,
  ...props
}: CardTitleProps) {
  return (
    <h3
      className={cn(
        "text-heading-6 font-bold text-dark dark:text-white",
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
}

export function CardDescription({
  children,
  className,
  ...props
}: CardDescriptionProps) {
  return (
    <p
      className={cn(
        "text-sm text-gray-600 dark:text-gray-400",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardContent({
  children,
  className,
  ...props
}: CardContentProps) {
  return (
    <div className={cn("", className)} {...props}>
      {children}
    </div>
  );
}

