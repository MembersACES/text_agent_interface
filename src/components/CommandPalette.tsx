"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
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
  utility_type_identifier?: string | null;
  utility_display?: string | null;
  identifier?: string | null;
  status?: string;
}

interface SearchResult {
  clients: SearchClient[];
  offers: SearchOffer[];
}

export function CommandPalette() {
  const { data: session } = useSession();
  const token = (session as any)?.id_token || (session as any)?.accessToken;
  const palette = useCommandPalette();
  const open = palette?.open ?? false;
  const setOpen = palette?.setOpen ?? (() => {});
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResult(null);
  }, [open]);

  useEffect(() => {
    if (!token || !open) return;
    if (!debouncedQuery) {
      setResult({ clients: [], offers: [] });
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`${getApiBaseUrl()}/api/search?q=${encodeURIComponent(debouncedQuery)}&limit=8`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    })
      .then((res) => (res.ok ? res.json() : { clients: [], offers: [] }))
      .then((data: SearchResult) => {
        if (!cancelled) setResult(data);
      })
      .catch(() => {
        if (!cancelled) setResult({ clients: [], offers: [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label="Search members and offers"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center border-b border-gray-200 dark:border-gray-700 px-3 py-2">
          <span className="text-gray-400 dark:text-gray-500 mr-2" aria-hidden>
            ⌘K
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search members and offers..."
            className="flex-1 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none text-sm py-1"
            autoFocus
            aria-label="Search"
          />
        </div>
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {loading && !result ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Searching...
            </div>
          ) : !debouncedQuery ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Type to search clients by name or offers by business name / identifier.
            </div>
          ) : !hasResults ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              No clients or offers found.
            </div>
          ) : (
            <>
              {result!.clients.length > 0 && (
                <div className="px-2 pb-2">
                  <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Clients
                  </p>
                  <ul className="space-y-0.5">
                    {result!.clients.map((c) => (
                      <li key={`c-${c.id}`}>
                        <Link
                          href={`/crm-members/${c.id}`}
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-left text-sm text-gray-900 dark:text-gray-100"
                          onClick={() => setOpen(false)}
                        >
                          <span className="font-medium truncate">{c.business_name}</span>
                          {c.stage && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 capitalize">
                              {c.stage.replace(/_/g, " ")}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result!.offers.length > 0 && (
                <div className="px-2 pb-2">
                  <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Offers
                  </p>
                  <ul className="space-y-0.5">
                    {result!.offers.map((o) => (
                      <li key={`o-${o.id}`}>
                        <Link
                          href={`/offers/${o.id}`}
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-left text-sm text-gray-900 dark:text-gray-100"
                          onClick={() => setOpen(false)}
                        >
                          <span className="truncate">
                            {o.business_name || "Offer"}{(o.utility_display || o.utility_type_identifier || o.identifier) ? ` · ${(o.utility_display || o.utility_type_identifier || o.utility_type || "Offer") + (o.identifier ? " " + o.identifier : "")}` : ""}
                          </span>
                          {o.status && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 capitalize">
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
