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
// Bump on every embed rebuild. The iframe HTML is otherwise cached aggressively by the browser, so a
// rebuilt embed (e.g. the async _apiGet freeze fix) wouldn't load on a normal refresh without this.
const EMBED_VERSION = "20260623-async";

interface EntityOption {
  slug: string;
  label: string;
}

type ContractEntry = { file_id: string | null; status: string | null; link: string | null };
type ContractsResp = { matched?: boolean; contracts?: Record<string, ContractEntry> };
type DocLink = { label: string; link: string };
type UtilInvoices = { utility: string; identifier: string; total: number; withPdf: number; missing: number; supported: boolean; links: DocLink[] };

/**
 * ACES Evidence panel — surfaces the contract + invoice FILE IDs straight from the sheets for the
 * selected entity. Marcus's engine receives these in its payload (manifest sites[].contract, waste
 * getSite waste_invoice_documents) but does not render them yet — so we show them here, using the same
 * sheet-backed endpoints the ACES Waste page uses (FILE_IDS sheet + raw waste dump). Pure read-only.
 */
function AcesEvidence({ token, businessName }: { token: string; businessName: string }) {
  const [contracts, setContracts] = useState<ContractsResp | null>(null);
  const [invoices, setInvoices] = useState<UtilInvoices[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!businessName) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      setContracts(null);
      setInvoices(null);
      try {
        const base = getApiBaseUrl();
        const auth = { Authorization: `Bearer ${token}` };
        // 1. Resolve the canonical member (same call the ACES Waste page uses) -> exact name + linkage.
        const bRes = await fetch(`${base}/api/get-business-info`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...auth },
          body: JSON.stringify({ business_name: businessName }),
        });
        const bData = (bRes.ok ? await bRes.json() : {}) as Record<string, unknown>;
        const resolvedName = ((bData.business_details as Record<string, unknown>)?.name as string) || businessName;
        // 2. Signed-contract file IDs per utility (FILE_IDS sheet) — keyed by the resolved name.
        const cRes = await fetch(`${base}/api/contracts/by-business?business_name=${encodeURIComponent(resolvedName)}`, { headers: auth });
        const cData = (cRes.ok ? await cRes.json() : null) as ContractsResp | null;
        if (!cancelled) setContracts(cData);
        // 3. For EVERY linked utility (each meter/account), pull its invoice PDF links from that
        //    utility's tab of the Member ACES Data workbook. Each tab is keyed differently (NMI/MRIN/
        //    account) — the backend matches the identifier against the right column.
        const linked = ((bData.Linked_Details as Record<string, unknown>)?.linked_utilities as Record<string, unknown>) || {};
        const pairs: { utility: string; identifier: string }[] = [];
        for (const [utility, recs] of Object.entries(linked)) {
          for (const rec of (recs as Array<Record<string, unknown>>) || []) {
            const identifier = String(rec.identifier ?? "").trim();
            if (identifier) pairs.push({ utility, identifier });
          }
        }
        const out = await Promise.all(
          pairs.map(async ({ utility, identifier }): Promise<UtilInvoices> => {
            const uRes = await fetch(
              `${base}/api/utility-invoice-links?utility_type=${encodeURIComponent(utility)}&identifier=${encodeURIComponent(identifier)}`,
              { headers: auth },
            );
            const u = (uRes.ok ? await uRes.json() : null) as
              | { documents?: DocLink[]; total_count?: number; with_pdf?: number; missing_count?: number; supported?: boolean }
              | null;
            const links = (u?.documents ?? []).filter((d) => d.link);
            return {
              utility,
              identifier,
              total: u?.total_count ?? 0,
              withPdf: u?.with_pdf ?? links.length,
              missing: u?.missing_count ?? 0,
              supported: u?.supported ?? false,
              links,
            };
          }),
        );
        if (!cancelled) setInvoices(out);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Evidence lookup failed.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [businessName, token]);

  const contractRows = contracts?.contracts ? Object.entries(contracts.contracts) : [];

  return (
    <details open className="rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark">
      <summary className="cursor-pointer text-sm font-bold text-dark dark:text-white">
        ACES Evidence — contract &amp; invoice file IDs (from the sheets){" "}
        <span className="font-normal text-dark-6 dark:text-dark-6">· Marcus&apos;s engine receives these but doesn&apos;t render them yet</span>
      </summary>
      {loading && <div className="mt-2 text-xs text-dark-6 dark:text-dark-6">Loading evidence…</div>}
      {err && <div className="mt-2 text-xs text-red-500">{err}</div>}
      {!loading && !err && (
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase text-dark-6 dark:text-dark-6">Signed contracts</div>
            {contractRows.length === 0 ? (
              <div className="text-xs text-dark-6 dark:text-dark-6">No contract record matched for this business.</div>
            ) : (
              <ul className="space-y-1 text-sm">
                {contractRows.map(([util, c]) => (
                  <li key={util} className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-dark dark:text-white">{util}</span>
                    {c.status && <span className="text-xs text-dark-6 dark:text-dark-6">· {c.status}</span>}
                    {c.link ? (
                      <a href={c.link} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary hover:underline">
                        View contract ↗
                      </a>
                    ) : (
                      <span className="text-xs text-red-500">no file</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold uppercase text-dark-6 dark:text-dark-6">Invoice PDFs by utility</div>
            {!invoices || invoices.length === 0 ? (
              <div className="text-xs text-dark-6 dark:text-dark-6">No linked utilities.</div>
            ) : (
              <ul className="space-y-2 text-sm">
                {invoices.map((u) => (
                  <li key={`${u.utility}|${u.identifier}`}>
                    <div className="text-xs text-dark-6 dark:text-dark-6">
                      <span className="font-medium text-dark dark:text-white">{u.utility}</span> · {u.identifier} ·{" "}
                      {u.supported ? (
                        <>
                          {u.withPdf}/{u.total} with PDF
                          {u.missing > 0 && <span className="text-red-500"> · {u.missing} missing</span>}
                        </>
                      ) : (
                        <span className="text-dark-6 dark:text-dark-6">no sheet mapped</span>
                      )}
                    </div>
                    {u.links.length > 0 && (
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {u.links.slice(0, 12).map((l, i) => (
                          <a key={i} href={l.link} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                            {l.label || `Invoice ${i + 1}`} ↗
                          </a>
                        ))}
                      </div>
                    )}
                    {u.supported && u.links.length === 0 && (
                      <div className="text-xs text-amber-600">no match in sheet (check the join key for this utility)</div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </details>
  );
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
    qs.set("v", EMBED_VERSION); // cache-bust: force the browser to load the freshly-built embed
    return `${EMBED_PATH}?${qs.toString()}`;
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

      {entity && (
        <AcesEvidence token={token} businessName={roster.find((o) => o.slug === entity)?.label ?? entity} />
      )}

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
