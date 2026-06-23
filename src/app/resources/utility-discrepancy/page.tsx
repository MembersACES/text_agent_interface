"use client";

/**
 * ACES Waste Discrepancy Review (operational, ACES-native).
 *
 * Two ways in:
 *   1. Standalone (from the Discrepancy nav group) — member-gated: pick a CRM member, we load
 *      get-business-info, and if a Waste utility is linked you click through to its review.
 *   2. Deep-link (from a member's Utilities-tab "Waste Discrepancy Review" button) —
 *      /resources/utility-discrepancy?utility_type=Waste&identifier=09097571&business_name=...
 *      which skips the gate and lands straight on the account.
 *
 * Data: POST /api/utility-invoice-rows (Airtable, keyed by utility_type + identifier). The page
 * surfaces the discrepancy (invoiced vs calculated), grades severity, explains each row in plain
 * English, and self-validates — flagging both real discrepancies AND data that doesn't reconcile,
 * including a bin-by-bin breakdown that flags itself if the bins don't sum to the calculated total.
 */

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { getApiBaseUrl } from "@/lib/utils";

type Row = Record<string, unknown>;

const TOL = 1; // dollars

const F = {
  date: "Invoice Date",
  number: "Invoice Number",
  invoiced: "Invoice Total Amount",
  calculated: "Total Calculated Cost",
  difference: "Difference",
  provider: "Provider",
};

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}
function money(n: number | null): string {
  return n == null ? "—" : n.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
}
function text(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) return v.map(text).join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
function parseDMY(v: unknown): number {
  const m = String(v ?? "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime() : 0;
}
function severity(abs: number): { label: string; color: string } {
  if (abs < TOL) return { label: "Matches", color: "#16a34a" };
  if (abs >= 500) return { label: "High", color: "#dc2626" };
  if (abs >= 50) return { label: "Medium", color: "#d97706" };
  return { label: "Low", color: "#ca8a04" };
}

// Reconstruct the bin-by-bin cost so the calculated total has visible "evidence".
function reconstructBins(r: Row) {
  const lines: { bin: number; desc: string; rate: number | null; count: number | null; subtotal: number }[] = [];
  for (let n = 1; n <= 6; n++) {
    const desc = text(r[`Bin ${n} Description`]);
    const rate = num(r[n === 1 ? "Pick up Rate Bin 1" : `Pick up Rate ${n}`]);
    const count = num(r[n === 1 ? "Total Bins Picked Up Bin 1" : `Total Bins Picked Up ${n}`]);
    if (!desc && rate == null && count == null) continue;
    lines.push({ bin: n, desc, rate, count, subtotal: (rate ?? 0) * (count ?? 0) });
  }
  const exDesc = text(r["Extra Pickup Description Bin 1"]);
  const exQty = num(r["Extra Pickup Quantity Bin 1"]);
  const exRate = num(r["Extra Pickup Rate Bin 1"]);
  const extra =
    exDesc || exQty != null || exRate != null
      ? { desc: exDesc, qty: exQty, rate: exRate, subtotal: (exQty ?? 0) * (exRate ?? 0) }
      : null;
  const reconstructed = lines.reduce((s, l) => s + l.subtotal, 0) + (extra ? extra.subtotal : 0);
  return { lines, extra, reconstructed };
}

// ---- Member gate ------------------------------------------------------------
function MemberGate({
  token,
  onPick,
}: {
  token: string;
  onPick: (a: { identifier: string; retailer: string; businessName: string }) => void;
}) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [member, setMember] = useState<{ name: string; waste: { identifier: string; retailer: string }[]; otherTypes: string[] } | null>(null);

  const search = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setMember(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/get-business-info`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ business_name: q }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(d.detail || "Member not found");
      }
      const data = (await res.json()) as Record<string, unknown>;
      const name = ((data.business_details as Record<string, unknown>)?.name as string) || q;
      const linked = ((data.Linked_Details as Record<string, unknown>)?.linked_utilities as Record<string, unknown>) || {};
      const wasteRaw = (linked["Waste"] as Array<Record<string, unknown>>) || [];
      const waste = wasteRaw.map((w) => ({ identifier: String(w.identifier ?? ""), retailer: String(w.retailer ?? "") })).filter((w) => w.identifier);
      const otherTypes = Object.keys(linked).filter((k) => k !== "Waste");
      setMember({ name, waste, otherTypes });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lookup failed.");
    } finally {
      setLoading(false);
    }
  }, [query, token]);

  return (
    <div className="rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark sm:p-6">
      <h2 className="text-heading-6 font-bold text-dark dark:text-white">ACES Waste Discrepancy Review</h2>
      <p className="mt-1 text-sm text-dark-6 dark:text-dark-6">
        Operational view from ACES utility/client data. Independent check:{" "}
        <span className="font-medium">Reporting Entity Assurance — Marcus Engine</span>.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Search a member by business name…"
          className="min-w-[260px] flex-1 rounded-lg border border-stroke bg-transparent px-4 py-2 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
        />
        <button
          type="button"
          onClick={() => search()}
          disabled={loading || !query.trim()}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
        >
          {loading ? "Searching…" : "Find member"}
        </button>
      </div>

      {error && <div className="mt-3 text-sm text-red">{error}</div>}

      {member && (
        <div className="mt-5">
          <div className="text-sm font-semibold text-dark dark:text-white">{member.name}</div>
          {member.waste.length === 0 ? (
            <div className="mt-2 text-sm text-dark-6 dark:text-dark-6">
              No Waste utility linked for this member.
              {member.otherTypes.length > 0 && <> Other linked utilities: {member.otherTypes.join(", ")} (review coming for these).</>}
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              <div className="text-xs uppercase text-dark-6 dark:text-dark-6">Linked waste accounts — click to review</div>
              {member.waste.map((w) => (
                <button
                  key={w.identifier}
                  type="button"
                  onClick={() => onPick({ ...w, businessName: member.name })}
                  className="flex w-full items-center justify-between rounded-lg border border-stroke px-4 py-3 text-left text-sm hover:bg-gray-2 dark:border-dark-3 dark:hover:bg-dark-2"
                >
                  <span className="font-mono text-dark dark:text-white">{w.identifier}</span>
                  <span className="text-dark-6 dark:text-dark-6">{w.retailer || "Waste"} ›</span>
                </button>
              ))}
              {member.otherTypes.length > 0 && (
                <div className="pt-1 text-xs text-dark-6 dark:text-dark-6">
                  Other linked utilities (review coming): {member.otherTypes.join(", ")}.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Account view -----------------------------------------------------------
function AccountView({
  token,
  utilityType,
  identifier,
  businessName,
  onBack,
}: {
  token: string;
  utilityType: string;
  identifier: string;
  businessName: string;
  onBack?: () => void;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [contract, setContract] = useState<{ status?: string | null; link?: string | null } | null>(null);
  const [contractChecked, setContractChecked] = useState(false);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/utility-invoice-rows`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ utility_type: utilityType, identifier, max_records: 200, sort_dir: "desc" }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(d.detail || `Request failed: ${res.status}`);
      }
      const data = (await res.json()) as { rows?: Row[] };
      setRows(data.rows ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load records.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token, utilityType, identifier]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  // Surface the signed contract for this business + utility (read-only, best-effort).
  useEffect(() => {
    if (!businessName) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${getApiBaseUrl()}/api/contracts/by-business?business_name=${encodeURIComponent(businessName)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) { if (!cancelled) setContractChecked(true); return; }
        const data = (await res.json()) as { contracts?: Record<string, { status?: string | null; link?: string | null }> };
        const c = data.contracts?.[utilityType] ?? data.contracts?.["Waste"] ?? null;
        if (!cancelled) { setContract(c); setContractChecked(true); }
      } catch {
        if (!cancelled) setContractChecked(true);
      }
    })();
    return () => { cancelled = true; };
  }, [businessName, utilityType, token]);

  const sorted = useMemo(() => [...rows].sort((a, b) => parseDMY(b[F.date]) - parseDMY(a[F.date])), [rows]);

  const summary = useMemo(() => {
    let invoiced = 0, calculated = 0, recoverable = 0, flagged = 0, integrity = 0;
    for (const r of rows) {
      const inv = num(r[F.invoiced]);
      const calc = num(r[F.calculated]);
      invoiced += inv ?? 0;
      calculated += calc ?? 0;
      if (inv != null && calc != null) {
        const over = inv - calc; // invoiced above calculated = overcharge to recover
        if (over >= TOL) recoverable += over;
        if (Math.abs(over) >= TOL) flagged += 1;
        const stored = num(r[F.difference]);
        if (stored != null && Math.abs((calc - inv) - stored) > 0.5) integrity += 1;
      } else {
        integrity += 1;
      }
    }
    return { invoiced, calculated, recoverable, flagged, integrity, count: rows.length };
  }, [rows]);

  const rawCols = useMemo(() => {
    const seen: string[] = [];
    for (const r of rows) for (const k of Object.keys(r)) if (!seen.includes(k)) seen.push(k);
    return seen;
  }, [rows]);

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {onBack && (
              <button type="button" onClick={onBack} className="mb-2 text-xs font-medium text-primary hover:underline">
                ← Back to member search
              </button>
            )}
            <h2 className="text-heading-6 font-bold text-dark dark:text-white">
              {utilityType} Discrepancy Review
            </h2>
            <p className="mt-1 text-sm text-dark-6 dark:text-dark-6">
              {businessName ? <span className="font-medium">{businessName}</span> : "Account"} · account{" "}
              <span className="font-mono">{identifier}</span>
            </p>
            {contractChecked && (
              <p className="mt-1 text-xs">
                {contract?.link ? (
                  <a href={contract.link} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline" style={{ color: "#16a34a" }}>
                    ✓ Signed {utilityType.toLowerCase()} contract on file{contract.status ? ` · ${contract.status}` : ""}
                  </a>
                ) : (
                  <span style={{ color: "#d97706" }}>No signed {utilityType.toLowerCase()} contract on file (matched by business name)</span>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setShowRaw((s) => !s)} className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2">
              {showRaw ? "Hide all fields" : "Show all fields"}
            </button>
            <button type="button" onClick={() => fetchRows()} disabled={loading} className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark hover:bg-gray-2 disabled:opacity-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2">
              {loading ? "Loading…" : "Reload"}
            </button>
          </div>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-light-3 bg-red-light-6 p-3 text-sm text-red">{error}</div>}

        {rows.length > 0 && (
          <>
            <div className="mb-4 rounded-lg p-4" style={{ background: "rgba(220,38,38,0.06)" }}>
              <div className="text-xs uppercase tracking-wide" style={{ color: "#dc2626" }}>Potential overcharge to review</div>
              <div className="text-3xl font-extrabold" style={{ color: "#dc2626" }}>{money(summary.recoverable)}</div>
              <div className="mt-1 text-xs text-dark-6 dark:text-dark-6">
                across {summary.flagged} of {summary.count} invoices · net variance (calculated − invoiced) {money(summary.calculated - summary.invoiced)}
                {summary.integrity > 0 && <> · <span style={{ color: "#d97706" }}>{summary.integrity} row(s) with data that doesn&apos;t reconcile</span></>}
              </div>
            </div>
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { l: "Invoices", v: String(summary.count) },
                { l: "Total invoiced", v: money(summary.invoiced) },
                { l: "Total calculated", v: money(summary.calculated) },
                { l: "Flagged", v: `${summary.flagged} / ${summary.count}` },
              ].map((c) => (
                <div key={c.l} className="rounded-lg border border-stroke p-3 dark:border-dark-3">
                  <div className="text-xs uppercase text-dark-6 dark:text-dark-6">{c.l}</div>
                  <div className="mt-1 text-lg font-bold text-dark dark:text-white">{c.v}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {!error && !loading && rows.length === 0 && (
          <div className="py-10 text-center text-sm text-dark-6 dark:text-dark-6">
            No {utilityType.toLowerCase()} records found for account <span className="font-mono">{identifier}</span>.
          </div>
        )}

        {/* Findings table */}
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-stroke dark:border-dark-3">
                  {["", "Invoice date", "Invoice #", "Invoiced", "Calculated", "Variance", "Severity", "Finding"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 font-semibold text-dark-6 dark:text-dark-6">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => {
                  const inv = num(r[F.invoiced]);
                  const calc = num(r[F.calculated]);
                  const over = inv != null && calc != null ? inv - calc : null;
                  const abs = over == null ? 0 : Math.abs(over);
                  const sev = over == null ? { label: "No data", color: "#d97706" } : severity(abs);
                  const stored = num(r[F.difference]);
                  const integrity = inv == null || calc == null || (stored != null && Math.abs((calc - inv) - stored) > 0.5);
                  const finding =
                    over == null
                      ? "Missing invoiced or calculated amount — cannot assess."
                      : abs < TOL
                        ? "Invoiced matches the calculated bin cost."
                        : `Invoiced ${money(inv)} vs calculated ${money(calc)} — ${money(abs)} ${over > 0 ? "overcharged" : "undercharged"}.`;
                  const bins = reconstructBins(r);
                  const reconOff = calc != null && Math.abs(bins.reconstructed - calc) > 0.5;
                  return (
                    <Fragment key={i}>
                      <tr className="border-b border-stroke/60 dark:border-dark-3/60">
                        <td className="px-2 py-2">
                          <button type="button" onClick={() => setOpen(open === i ? null : i)} className="text-dark-6 hover:text-primary dark:text-dark-6" aria-label="evidence">
                            {open === i ? "▾" : "▸"}
                          </button>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-dark dark:text-white">{text(r[F.date])}</td>
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-dark dark:text-white">{text(r[F.number])}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-dark dark:text-white">{money(inv)}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-dark dark:text-white">{money(calc)}</td>
                        <td className="whitespace-nowrap px-3 py-2 font-semibold" style={{ color: sev.color }}>{over == null ? "—" : money(over)}</td>
                        <td className="whitespace-nowrap px-3 py-2">
                          <span className="rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ background: sev.color }}>{sev.label}</span>
                          {integrity && <span className="ml-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ background: "#d97706" }} title="Fields do not reconcile">data?</span>}
                        </td>
                        <td className="px-3 py-2 text-dark dark:text-white">{finding}</td>
                      </tr>
                      {open === i && (
                        <tr className="border-b border-stroke/60 dark:border-dark-3/60">
                          <td colSpan={8} className="bg-gray-1 px-4 py-3 dark:bg-dark-2">
                            <div className="text-xs font-semibold uppercase text-dark-6 dark:text-dark-6">Evidence — bin-by-bin calculation</div>
                            <table className="mt-2 w-full text-left text-xs">
                              <thead>
                                <tr className="text-dark-6 dark:text-dark-6">
                                  <th className="px-2 py-1">Bin / item</th><th className="px-2 py-1">Rate</th><th className="px-2 py-1">Pickups</th><th className="px-2 py-1">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody>
                                {bins.lines.map((l) => (
                                  <tr key={l.bin} className="text-dark dark:text-white">
                                    <td className="px-2 py-1">{l.desc || `Bin ${l.bin}`}</td>
                                    <td className="px-2 py-1">{money(l.rate)}</td>
                                    <td className="px-2 py-1">{l.count ?? "—"}</td>
                                    <td className="px-2 py-1">{money(l.subtotal)}</td>
                                  </tr>
                                ))}
                                {bins.extra && (
                                  <tr className="text-dark dark:text-white">
                                    <td className="px-2 py-1">{bins.extra.desc || "Extra pickup"}</td>
                                    <td className="px-2 py-1">{money(bins.extra.rate)}</td>
                                    <td className="px-2 py-1">{bins.extra.qty ?? "—"}</td>
                                    <td className="px-2 py-1">{money(bins.extra.subtotal)}</td>
                                  </tr>
                                )}
                                <tr className="font-semibold text-dark dark:text-white">
                                  <td className="px-2 py-1" colSpan={3}>Reconstructed total</td>
                                  <td className="px-2 py-1">{money(bins.reconstructed)}</td>
                                </tr>
                              </tbody>
                            </table>
                            <div className="mt-2 text-xs" style={{ color: reconOff ? "#dc2626" : "#16a34a" }}>
                              {calc == null
                                ? "No calculated total to reconcile against."
                                : reconOff
                                  ? `⚠ Bin breakdown (${money(bins.reconstructed)}) does not reconcile to the calculated total (${money(calc)}). Check the source data / field mapping before relying on this row.`
                                  : `✓ Bin breakdown reconciles to the calculated total (${money(calc)}).`}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {showRaw && rows.length > 0 && (
          <div className="mt-6 overflow-x-auto border-t border-stroke pt-4 dark:border-dark-3">
            <div className="mb-2 text-xs font-semibold uppercase text-dark-6 dark:text-dark-6">All fields (raw)</div>
            <table className="w-full min-w-[640px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-stroke dark:border-dark-3">
                  {rawCols.map((c) => <th key={c} className="whitespace-nowrap px-2 py-1.5 font-semibold text-dark-6 dark:text-dark-6">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr key={i} className="border-b border-stroke/60 align-top dark:border-dark-3/60">
                    {rawCols.map((c) => <td key={c} className="px-2 py-1.5 text-dark dark:text-white">{text(r[c])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Page -------------------------------------------------------------------
export default function UtilityDiscrepancyPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const token =
    (session as { id_token?: string; accessToken?: string })?.id_token ??
    (session as { id_token?: string; accessToken?: string })?.accessToken;

  const deepIdentifier = (searchParams.get("identifier") ?? "").trim();
  const deepUtility = searchParams.get("utility_type") ?? "Waste";
  const deepBusiness = searchParams.get("business_name") ?? "";

  const [picked, setPicked] = useState<{ identifier: string; retailer: string; businessName: string } | null>(null);

  if (status === "loading") return <div className="p-6 text-sm text-dark-6 dark:text-dark-6">Loading…</div>;
  if (!token) return <div className="p-6 text-sm text-dark-6 dark:text-dark-6">Please sign in to load discrepancy records.</div>;

  if (deepIdentifier) {
    return <AccountView token={token} utilityType={deepUtility} identifier={deepIdentifier} businessName={deepBusiness} />;
  }
  if (picked) {
    return <AccountView token={token} utilityType="Waste" identifier={picked.identifier} businessName={picked.businessName} onBack={() => setPicked(null)} />;
  }
  return <MemberGate token={token} onPick={setPicked} />;
}
