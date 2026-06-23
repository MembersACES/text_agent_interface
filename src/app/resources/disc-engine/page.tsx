"use client";

/**
 * Reporting Entity Assurance — Marcus Engine.
 *
 * ACES-native wrapper around the Prograde "contract-vs-actuals" dashboard (an embedded
 * static asset at public/disc-engine/disc-engine-embed.html, generated from the pristine
 * vendor copy by scripts/build-disc-engine.mjs). This page:
 *   1. authenticates as the signed-in staff member (NextAuth id_token), and hands the embed
 *      its API host + bearer token over an origin-pinned postMessage handshake;
 *   2. offers a reporting_entity picker (from /api/climate/roster) so staff/Marcus can load
 *      any entity into the embed — his validation route.
 * Data reads are GETs the embed makes to /api/climate/* under the staff session.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { getApiBaseUrl } from "@/lib/utils";

const EMBED_PATH = "/disc-engine/disc-engine-embed.html";

interface EntityOption {
  slug: string;
  label: string;
}

export default function DiscEnginePage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();

  const token =
    (session as { id_token?: string; accessToken?: string })?.id_token ??
    (session as { id_token?: string; accessToken?: string })?.accessToken;

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const tokenRef = useRef<string | undefined>(token);

  const period = searchParams.get("period") ?? "";
  const [entity, setEntity] = useState(searchParams.get("entity") ?? "");
  const [roster, setRoster] = useState<EntityOption[]>([]);
  const [rosterMsg, setRosterMsg] = useState<string | null>(null);
  const [frameLoaded, setFrameLoaded] = useState(false);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const src = (() => {
    const qs = new URLSearchParams();
    if (entity) qs.set("entity", entity);
    if (period) qs.set("period", period);
    return qs.toString() ? `${EMBED_PATH}?${qs.toString()}` : EMBED_PATH;
  })();

  // Push API host + bearer token into the (same-origin) embed.
  const postAuth = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    const t = tokenRef.current;
    if (!win || !t) return;
    win.postMessage({ type: "aces:auth", token: t, apiHost: getApiBaseUrl() }, window.location.origin);
  }, []);

  // Re-issue a fresh token when the embed reports 401 -> {type:'aces:reauth'}.
  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      if (ev.origin !== window.location.origin) return;
      const data = ev.data as { type?: string } | null;
      if (data?.type === "aces:reauth") postAuth();
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [postAuth]);

  // (Re)send auth once the frame is ready and a token exists — handles either ordering.
  useEffect(() => {
    if (frameLoaded && token) postAuth();
  }, [frameLoaded, token, postAuth]);

  // Load the reporting_entity roster for the picker.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/climate/roster`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`roster ${res.status}`);
        const data = (await res.json()) as { clients?: Record<string, unknown>[] };
        const opts: EntityOption[] = [];
        const seen = new Set<string>();
        for (const c of data.clients ?? []) {
          const fromLink = String(c.deep_link ?? "").match(/entity=([^&]+)/)?.[1] ?? "";
          const slug = decodeURIComponent(String(c.reporting_entity ?? fromLink ?? "")).trim();
          if (!slug || seen.has(slug)) continue;
          seen.add(slug);
          opts.push({ slug, label: String(c.business_name ?? slug) });
        }
        if (!cancelled) {
          setRoster(opts);
          if (opts.length === 0) setRosterMsg("No reporting entities returned by the roster.");
        }
      } catch (e) {
        if (!cancelled) setRosterMsg(e instanceof Error ? e.message : "Could not load roster.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (status === "loading")
    return <div className="p-6 text-sm text-dark-6 dark:text-dark-6">Loading…</div>;
  if (!token)
    return <div className="p-6 text-sm text-dark-6 dark:text-dark-6">Please sign in to load this view.</div>;

  return (
    <div className="flex h-[calc(100vh-6.5rem)] min-h-[640px] flex-col gap-3">
      <div className="rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-heading-6 font-bold text-dark dark:text-white">
              Reporting Entity Assurance — Marcus Engine
            </h2>
            <p className="mt-1 text-sm text-dark-6 dark:text-dark-6">
              Independent reporting_entity / terms-API assurance view. Operational view:{" "}
              <a href="/resources/utility-discrepancy" className="font-medium text-primary hover:underline">
                ACES Waste Discrepancy Review
              </a>
              .
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="entity-picker" className="text-sm text-dark-6 dark:text-dark-6">
              Reporting entity
            </label>
            <select
              id="entity-picker"
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              className="min-w-[220px] rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
            >
              <option value="">— select an entity —</option>
              {roster.map((o) => (
                <option key={o.slug} value={o.slug}>
                  {o.label} ({o.slug})
                </option>
              ))}
            </select>
          </div>
        </div>
        {rosterMsg && <div className="mt-2 text-xs text-dark-6 dark:text-dark-6">{rosterMsg}</div>}
        {!entity && (
          <div className="mt-2 text-xs text-dark-6 dark:text-dark-6">
            Pick a reporting entity to load it into the engine below.
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark">
        <iframe
          ref={iframeRef}
          src={src}
          title="Reporting Entity Assurance — Marcus Engine"
          onLoad={() => { setFrameLoaded(true); postAuth(); }}
          className="h-full w-full border-0"
        />
      </div>
    </div>
  );
}
