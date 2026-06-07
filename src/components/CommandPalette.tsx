"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ClipboardList,
  FileText,
  FolderPlus,
  LayoutDashboard,
  Leaf,
  ListTodo,
  UserPlus,
  Users,
} from "lucide-react";
import { getApiBaseUrl } from "@/lib/utils";
import { useCommandPalette } from "@/components/CommandPaletteContext";

interface SearchClient {
  id: number;
  business_name: string;
  stage?: string;
  owner_email?: string | null;
}

interface SearchOffer {
  id: number;
  client_id?: number | null;
  business_name?: string | null;
  utility_type?: string | null;
  utility_type_identifier?: string | null;
  utility_display?: string | null;
  identifier?: string | null;
  status?: string;
}

interface SearchResult {
  clients: SearchClient[];
  offers: SearchOffer[];
}

const QUICK_ACTIONS = [
  { href: "/crm-members?openAdd=1", label: "Add new member", icon: UserPlus, section: "Actions" },
  { href: "/loa-upload", label: "Google Drive — New Member", icon: FolderPlus, section: "Actions" },
  { href: "/tasks", label: "View all tasks", icon: ClipboardList, section: "Actions" },
  { href: "/crm", label: "CRM dashboard", icon: LayoutDashboard, section: "Navigate" },
  { href: "/crm-members", label: "Browse members", icon: Users, section: "Navigate" },
  { href: "/offers", label: "Browse offers", icon: ListTodo, section: "Navigate" },
  { href: "/workflows", label: "All workflows", icon: FileText, section: "Navigate" },
  { href: "/design-system", label: "Design system", icon: Leaf, section: "Reference" },
];

export function CommandPalette() {
  const { data: session } = useSession();
  const token = (session as { id_token?: string; accessToken?: string })?.id_token ?? (session as { id_token?: string; accessToken?: string })?.accessToken;
  const palette = useCommandPalette();
  const open = palette?.open ?? false;
  const setOpen = useMemo(() => palette?.setOpen ?? (() => {}), [palette]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!token || !open || !debouncedQuery) return;
    let cancelled = false;
    fetch(`${getApiBaseUrl()}/api/search?q=${encodeURIComponent(debouncedQuery)}&limit=8`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    })
      .then((res) => (res.ok ? res.json() : { clients: [], offers: [] }))
      .then((data: SearchResult) => {
        if (!cancelled) setResult(data);
      })
      .catch(() => {
        if (!cancelled) setResult({ clients: [], offers: [] });
      });
    return () => { cancelled = true; };
  }, [token, open, debouncedQuery]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        palette?.toggle();
      }
      if (e.key === "Escape") setOpen(false);
    },
    [palette, setOpen]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const hasResults = useMemo(() => {
    if (!result) return false;
    return result.clients.length > 0 || result.offers.length > 0;
  }, [result]);

  const filteredQuickActions = useMemo(() => {
    if (!debouncedQuery) return QUICK_ACTIONS;
    const q = debouncedQuery.toLowerCase();
    return QUICK_ACTIONS.filter((a) => a.label.toLowerCase().includes(q));
  }, [debouncedQuery]);

  const quickActionSections = useMemo(() => {
    const sections = new Map<string, typeof QUICK_ACTIONS>();
    for (const action of filteredQuickActions) {
      const list = sections.get(action.section) ?? [];
      list.push(action);
      sections.set(action.section, list);
    }
    return sections;
  }, [filteredQuickActions]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Search and quick actions"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-stroke bg-white shadow-2xl dark:border-dark-3 dark:bg-gray-dark"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center border-b border-stroke px-4 py-3 dark:border-dark-3">
          <span className="mr-2 text-gray-400 dark:text-gray-500" aria-hidden>
            ⌘K
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setResult(null);
            }}
            placeholder="Search members, offers, or actions…"
            className="flex-1 bg-transparent py-1 text-sm text-dark placeholder-gray-400 focus:outline-none dark:text-white dark:placeholder-gray-500"
            autoFocus
            aria-label="Search"
          />
        </div>
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {!debouncedQuery && (
            <>
              {Array.from(quickActionSections.entries()).map(([section, actions]) => (
                <div key={section} className="px-2 pb-2">
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
                    {section}
                  </p>
                  <ul className="space-y-0.5">
                    {actions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <li key={action.href}>
                          <Link
                            href={action.href}
                            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-dark hover:bg-brand-disclosure/10 dark:text-white dark:hover:bg-brand-disclosure/15"
                            onClick={() => setOpen(false)}
                          >
                            <Icon className="size-4 shrink-0 text-primary" />
                            <span className="font-medium">{action.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </>
          )}

          {debouncedQuery && !result && (
            <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Searching…
            </div>
          )}

          {debouncedQuery && result && !hasResults && filteredQuickActions.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              No clients, offers, or actions found.
            </div>
          )}

          {debouncedQuery && filteredQuickActions.length > 0 && (
            <div className="px-2 pb-2">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
                Actions
              </p>
              <ul className="space-y-0.5">
                {filteredQuickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <li key={action.href}>
                      <Link
                        href={action.href}
                        className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-brand-disclosure/10 dark:hover:bg-brand-disclosure/15"
                        onClick={() => setOpen(false)}
                      >
                        <Icon className="size-4 text-primary" />
                        <span className="font-medium text-dark dark:text-white">{action.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {debouncedQuery && result && hasResults && (
            <>
              {result.clients.length > 0 && (
                <div className="px-2 pb-2">
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
                    Members
                  </p>
                  <ul className="space-y-0.5">
                    {result.clients.map((c) => (
                      <li key={`c-${c.id}`}>
                        <div className="flex items-stretch gap-1 rounded-xl hover:bg-gray/50 dark:hover:bg-dark-3">
                          <Link
                            href={`/crm-members/${c.id}`}
                            className="min-w-0 flex-1 px-3 py-2 text-left text-sm"
                            onClick={() => setOpen(false)}
                          >
                            <span className="block truncate font-medium text-dark dark:text-white">
                              {c.business_name}
                            </span>
                            {c.stage && (
                              <span className="text-xs capitalize text-gray-500 dark:text-gray-400">
                                {c.stage.replace(/_/g, " ")}
                              </span>
                            )}
                          </Link>
                          <Link
                            href={`/business-info?businessName=${encodeURIComponent(c.business_name)}`}
                            className="shrink-0 self-center px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-primary hover:underline"
                            onClick={() => setOpen(false)}
                            title="Open LOA-linked Airtable profile"
                          >
                            Profile
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.offers.length > 0 && (
                <div className="px-2 pb-2">
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
                    Offers
                  </p>
                  <ul className="space-y-0.5">
                    {result.offers.map((o) => (
                      <li key={`o-${o.id}`}>
                        <Link
                          href={`/offers/${o.id}`}
                          className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-gray/50 dark:hover:bg-dark-3"
                          onClick={() => setOpen(false)}
                        >
                          <span className="truncate text-dark dark:text-white">
                            {o.business_name || "Offer"}
                            {(o.utility_display || o.utility_type_identifier || o.identifier)
                              ? ` · ${(o.utility_display || o.utility_type_identifier || o.utility_type || "Offer")}${o.identifier ? " " + o.identifier : ""}`
                              : ""}
                          </span>
                          {o.status && (
                            <span className="shrink-0 text-xs capitalize text-gray-500 dark:text-gray-400">
                              {o.status.replace(/_/g, " ")}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
