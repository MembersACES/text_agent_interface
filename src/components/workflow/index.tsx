"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface BusinessSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
}

export function BusinessSearchBar({
  value,
  onChange,
  onSearch,
  loading = false,
  disabled = false,
  placeholder = "Enter business name to search…",
  label = "Business name",
}: BusinessSearchBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <Input
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        wrapperClassName="min-w-0 flex-1"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSearch();
          }
        }}
      />
      <Button
        onClick={onSearch}
        loading={loading}
        disabled={disabled || loading || !value.trim()}
      >
        Search
      </Button>
    </div>
  );
}

interface WorkflowSectionProps {
  title: string;
  description?: string;
  step?: number;
  children: ReactNode;
  className?: string;
}

export function WorkflowSection({
  title,
  description,
  step,
  children,
  className,
}: WorkflowSectionProps) {
  const displayTitle = step != null ? `${step}. ${title}` : title;
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{displayTitle}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

interface QuickLinksProps {
  links: Array<{ label: string; href: string; description?: string }>;
}

export function QuickLinks({ links }: QuickLinksProps) {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-sm">Quick access</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary hover:underline"
              >
                {link.label}
              </a>
              {link.description ? (
                <span className="text-gray-600 dark:text-gray-400"> — {link.description}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
