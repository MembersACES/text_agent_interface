"use client";

import { useClickOutside } from "@/hooks/use-click-outside";
import { cn } from "@/lib/utils";
import { ChevronDown, X } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

export interface FilterComboboxOption {
  value: string;
  label: string;
}

interface FilterComboboxProps {
  value: string;
  selectedLabel?: string;
  allLabel: string;
  options: FilterComboboxOption[];
  onChange: (value: string) => void;
  onQueryChange?: (query: string) => void;
  loading?: boolean;
  placeholder?: string;
  ariaLabel: string;
  className?: string;
}

export function FilterCombobox({
  value,
  selectedLabel,
  allLabel,
  options,
  onChange,
  onQueryChange,
  loading = false,
  placeholder,
  ariaLabel,
  className,
}: FilterComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const resolvedLabel = selectedLabel || options.find((o) => o.value === value)?.label || "";
  const displayValue = open ? query : value ? resolvedLabel : "";

  const filtered = useMemo(() => {
    if (onQueryChange) return options;
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    );
  }, [onQueryChange, options, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setHighlight(0);
  }, []);

  const containerRef = useClickOutside<HTMLDivElement>(() => {
    if (open) close();
  });

  const selectOption = (next: string) => {
    onChange(next);
    close();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlight((i) => Math.min(i + 1, filtered.length));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((i) => Math.max(i - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (highlight === 0) {
        selectOption("");
        return;
      }
      const option = filtered[highlight - 1];
      if (option) selectOption(option.value);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className={cn("relative min-w-[12rem] flex-1 sm:flex-none sm:w-56", className)}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-haspopup="listbox"
          role="combobox"
          placeholder={placeholder || allLabel}
          value={displayValue}
          onFocus={() => {
            setOpen(true);
            setQuery("");
            setHighlight(0);
            onQueryChange?.("");
          }}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            setOpen(true);
            onQueryChange?.(next);
          }}
          onKeyDown={handleKeyDown}
          className="h-9 w-full rounded-lg bg-canvas py-0 pl-3 pr-14 text-sm text-dark outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 dark:bg-dark-2 dark:text-white"
        />
        {value ? (
          <button
            type="button"
            aria-label={`Clear ${ariaLabel}`}
            className="absolute right-8 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-dark dark:hover:text-white"
            onMouseDown={(e) => {
              e.preventDefault();
              selectOption("");
            }}
          >
            <X className="size-3.5" aria-hidden />
          </button>
        ) : null}
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400"
          aria-hidden
        />
      </div>
      {open ? (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-stroke bg-white py-1 shadow-md dark:border-dark-3 dark:bg-gray-dark"
        >
          <li>
            <button
              type="button"
              role="option"
              aria-selected={!value}
              className={cn(
                "w-full px-3 py-2 text-left text-sm text-dark hover:bg-canvas dark:text-white dark:hover:bg-dark-3",
                highlight === 0 && "bg-canvas dark:bg-dark-3",
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                selectOption("");
              }}
            >
              {allLabel}
            </button>
          </li>
          {loading ? (
            <li className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">Searching…</li>
          ) : filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">No matches</li>
          ) : (
            filtered.map((option, index) => (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === option.value}
                  className={cn(
                    "w-full truncate px-3 py-2 text-left text-sm text-dark hover:bg-canvas dark:text-white dark:hover:bg-dark-3",
                    highlight === index + 1 && "bg-canvas dark:bg-dark-3",
                    value === option.value && "font-medium",
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectOption(option.value);
                  }}
                >
                  {option.label}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
