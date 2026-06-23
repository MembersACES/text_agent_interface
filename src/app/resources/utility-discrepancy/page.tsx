"use client";

/**
 * ACES Waste Discrepancy Review (operational, ACES-native).
 *
 * Source: the RAW waste invoice dump — GET /api/waste-invoice-rows?account= ('Member ACES Data' ->
 * '7th Sheet - Waste'). Uncleaned: every invoice run is dumped verbatim, no dedup. Each row carries
 * the per-bin schedule, the invoiced total, and a Drive 'Webview Link' (the invoice PDF).
 *
 * The page computes the EXPECTED cost from the bins itself (rates x pickups + per-bin extras + fuel
 * levy) and compares to the invoiced total — so the discrepancy is self-contained, no reliance on any
 * pre-computed field. It surfaces the invoice PDF per row, flags a blank link as a MISSING invoice
 * (a discrepancy, per ACES rule), flags likely duplicates, and shows the signed waste contract.
 *
 * Entry: standalone (member-gated search) or deep-link (?utility_type=Waste&identifier=&business_name=).
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
  provider: "Provider",
  period: "Review Period",
  webview: "Webview Link",
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

// Raw-sheet header names per bin (bin 1 uses "...Bin 1"; bins 2-6 use "...N"; bin 2 desc is "Bin 2 Description 2").
function binFields(n: number) {
  if (n === 1)
    return {
      desc: "Bin 1 Description",
      count: "Total Bins Picked Up Bin 1",
      rate: "Pick up Rate Bin 1",
      exDesc: "Extra Pickup Description Bin 1",
      exQty: "Extra Pickup Quantity Bin 1",
      exRate: "Extra Pickup Rate Bin 1",
    };
  return {
    desc: n === 2 ? "Bin 2 Description 2" : `Bin ${n} Description`,
    count: `Total Bins Picked Up ${n}`,
    rate: `Pick up Rate ${n}`,
    exDesc: `Extra Pickup Description ${n}`,
    exQty: `Extra Pickup Quantity ${n}`,
    exRate: `Extra Pickup Rate ${n}`,
  };
}

// Compute the expected cost from the bin schedule + per-bin extras + fuel levy.
function reconstructCost(r: Row) {
  const lines: { label: string; rate: number | null; count: number | null; subtotal: number }[] = [];
  const extras: { label: string; qty: number | null; rate: number | null; subtotal: number }[] = [];
  for (let n = 1; n <= 6; n++) {
    const f = binFields(n);
    let desc = text(r[f.desc]);
    if (n === 2 && !desc) desc = text(r["Bin 2 Description"]);
    const rate = num(r[f.rate]);
    const count = num(r[f.count]);
    if (desc || rate != null || count != null)
      lines.push({ label: desc || `Bin ${n}`, rate, count, subtotal: (rate ?? 0) * (count ?? 0) });
    const exDesc = text(r[f.exDesc]);
    const exQty = num(r[f.exQty]);
    const exRate = num(r[f.exRate]);
    if (exDesc || exQty != null || exRate != null)
      extras.push({ label: exDesc || `Extra pickup ${n}`, qty: exQty, rate: exRate, subtotal: (exQty ?? 0) * (exRate ?? 0) });
  }
  const fuelTotal = num(r["Fuel Levy Total"]);
  const fuelQty = num(r["Fuel Levy Quantity"]);
  const fuelRate = num(r["Fuel Levy Rate"]);
  const fuelLevy = fuelTotal != null ? fuelTotal : fuelQty != null && fuelRate != null ? fuelQty * fuelRate : 0;
  const reconstructed =
    lines.reduce((s, l) => s + l.subtotal, 0) + extras.reduce((s, e) => s + e.subtotal, 0) + (fuelLevy || 0);
  return { lines, extras, fuelLevy, reconstructed };
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
  const [contract, setContract] = useState<{ status?: string | null; link?: string | null } | null>(null);
  const [contractNote, setContractNote] = useState<string | null>(null);
  const [contractChecked, setContractChecked] = useState(false);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${getApiBaseUrl()}/api/waste-invoice-rows?account=${encodeURIComponent(identifier)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
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
  }, [token, identifier]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    if (!businessName) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${getApiBaseUrl()}/api/contracts/by-business?business_name=${encodeURIComponent(businessName)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) { if (!cancelled) { setContractNote(`Contract lookup failed (${res.status})`); setContractChecked(true); } return; }
        const data = (await res.json()) as { matched?: boolean; contracts?: Record<string, { status?: string | null; link?: string | null }> };
        const c = data.contracts?.["Waste"] ?? null;
        if (!cancelled) {
          setContract(c);
          if (!c) setContractNote(data.matched ? "No waste contract recorded for this business" : "No contract record matched this business name");
          setContractChecked(true);
        }
      } catch {
        if (!cancelled) { setContractNote("Contract lookup unavailable"); setContractChecked(true); }
      }
    })();
    return () => { cancelled = true; };
  }, [businessName, token]);

  const sorted = useMemo(() => [...rows].sort((a, b) => parseDMY(b[F.date]) - parseDMY(a[F.date])), [rows]);

  // duplicate invoice-number detection (raw dump has no dedup)
  const dupNumbers = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of rows) { const k = text(r[F.number]).trim(); if (k) counts[k] = (counts[k] || 0) + 1; }
    return new Set(Object.keys(counts).filter((k) => counts[k] > 1));
  }, [rows]);

  const summary = useMemo(() => {
    let invoiced = 0, calculated = 0, recoverable = 0, flagged = 0, missingPdf = 0;
    for (const r of rows) {
      const inv = num(r[F.invoiced]);
      const calc = reconstructCost(r).reconstructed;
      invoiced += inv ?? 0;
      calculated += calc;
      if (inv != null) {
        const over = inv - calc;
        if (over >= TOL) recoverable += over;
        if (Math.abs(over) >= TOL) flagged += 1;
      }
      if (!text(r[F.webview]).trim()) missingPdf += 1;
    }
    return { invoiced, calculated, recoverable, flagged, missingPdf, count: rows.length };
  }, [rows]);

  const cards = [
    { l: "Invoices", v: String(summary.count) },
    { l: "Total invoiced", v: money(summary.invoiced) },
    { l: "Calculated (schedule)", v: money(summary.calculated) },
    { l: "Flagged", v: `${summary.flagged} / ${summary.count}` },
    { l: "Missing PDFs", v: String(summary.missingPdf), color: summary.missingPdf > 0 ? "#d97706" : undefined },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {onBack && (
              <button type="button" onClick={onBack} className="mb-2 text-xs font-medium text-primary hover:underline">
                ← Back to member search
              </button>
            )}
            <h2 className="text-heading-6 font-bold text-dark dark:text-white">{utilityType} Discrepancy Review</h2>
            <p className="mt-1 text-sm text-dark-6 dark:text-dark-6">
              {businessName ? <span className="font-medium">{businessName}</span> : "Account"} · account{" "}
              <span className="font-mono">{identifier}</span>
            </p>
            {contractChecked && (
              <p className="mt-1 text-xs">
                {contract?.link ? (
                  <a href={contract.link} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline" style={{ color: "#16a34a" }}>
                    ✓ Signed waste contract on file{contract.status ? ` · ${contract.status}` : ""}
                  </a>
                ) : (
                  <span style={{ color: "#d97706" }}>{contractNote || "No signed waste contract on file"}</span>
                )}
              </p>
            )}
          </div>
          <button type="button" onClick={() => fetchRows()} disabled={loading} className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark hover:bg-gray-2 disabled:opacity-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2">
            {loading ? "Loading…" : "Reload"}
          </button>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-light-3 bg-red-light-6 p-3 text-sm text-red">{error}</div>}
        {loading && rows.length === 0 && (
          <div className="py-10 text-center text-sm text-dark-6 dark:text-dark-6">Loading waste records…</div>
        )}

        {rows.length > 0 && (
          <>
            <div className="mb-4 rounded-lg p-4" style={{ background: "rgba(220,38,38,0.06)" }}>
              <div className="text-xs uppercase tracking-wide" style={{ color: "#dc2626" }}>Potential overcharge to review</div>
              <div className="text-3xl font-extrabold" style={{ color: "#dc2626" }}>{money(summary.recoverable)}</div>
              <div className="mt-1 text-xs text-dark-6 dark:text-dark-6">
                across {summary.flagged} of {summary.count} invoices · invoiced − calculated {money(summary.invoiced - summary.calculated)}
                {summary.missingPdf > 0 && <> · <span style={{ color: "#d97706" }}>{summary.missingPdf} invoice(s) with no PDF (missing)</span></>}
              </div>
            </div>
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {cards.map((c) => (
                <div key={c.l} className="rounded-lg border border-stroke p-3 dark:border-dark-3">
                  <div className="text-xs uppercase text-dark-6 dark:text-dark-6">{c.l}</div>
                  <div className="mt-1 text-lg font-bold text-dark dark:text-white" style={c.color ? { color: c.color } : undefined}>{c.v}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {!error && !loading && rows.length === 0 && (
          <div className="py-10 text-center text-sm text-dark-6 dark:text-dark-6">
            No waste invoice records found for account <span className="font-mono">{identifier}</span>.
          </div>
        )}

        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-stroke dark:border-dark-3">
                  {["", "Invoice date", "Invoice #", "Invoiced", "Calculated", "Variance", "Severity", "Invoice PDF", "Finding"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 font-semibold text-dark-6 dark:text-dark-6">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => {
                  const inv = num(r[F.invoiced]);
                  const rc = reconstructCost(r);
                  const calc = rc.reconstructed;
                  const over = inv != null ? inv - calc : null;
                  const abs = over == null ? 0 : Math.abs(over);
                  const sev = over == null ? { label: "No total", color: "#d97706" } : severity(abs);
                  const link = text(r[F.webview]).trim();
                  const isDup = dupNumbers.has(text(r[F.number]).trim());
                  const finding =
                    over == null
                      ? "No invoiced total on this row — cannot assess."
                      : abs < TOL
                        ? "Invoiced matches the calculated bin cost."
                        : `Invoiced ${money(inv)} vs calculated ${money(calc)} — ${money(abs)} ${over > 0 ? "over" : "under"} the schedule.`;
                  return (
                    <Fragment key={i}>
                      <tr className="border-b border-stroke/60 dark:border-dark-3/60">
                        <td className="px-2 py-2">
                          <button type="button" onClick={() => setOpen(open === i ? null : i)} className="text-dark-6 hover:text-primary dark:text-dark-6">{open === i ? "▾" : "▸"}</button>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-dark dark:text-white">{text(r[F.date])}</td>
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-dark dark:text-white">
                          {text(r[F.number])}
                          {isDup && <span className="ml-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ background: "#d97706" }} title="This invoice number appears more than once in the raw dump">dup?</span>}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-dark dark:text-white">{money(inv)}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-dark dark:text-white">{money(calc)}</td>
                        <td className="whitespace-nowrap px-3 py-2 font-semibold" style={{ color: sev.color }}>{over == null ? "—" : money(over)}</td>
                        <td className="whitespace-nowrap px-3 py-2">
                          <span className="rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ background: sev.color }}>{sev.label}</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          {link ? (
                            <a href={link} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">View PDF</a>
                          ) : (
                            <span className="rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ background: "#dc2626" }} title="No confirmed Drive PDF for this invoice">Missing</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-dark dark:text-white">{finding}</td>
                      </tr>
                      {open === i && (
                        <tr className="border-b border-stroke/60 dark:border-dark-3/60">
                          <td colSpan={9} className="bg-gray-1 px-4 py-3 dark:bg-dark-2">
                            <div className="text-xs font-semibold uppercase text-dark-6 dark:text-dark-6">Evidence — how the calculated cost is built</div>
                            <table className="mt-2 w-full text-left text-xs">
                              <thead>
                                <tr className="text-dark-6 dark:text-dark-6"><th className="px-2 py-1">Line</th><th className="px-2 py-1">Rate</th><th className="px-2 py-1">Qty</th><th className="px-2 py-1">Subtotal</th></tr>
                              </thead>
                              <tbody>
                                {rc.lines.map((l, j) => (
                                  <tr key={`l${j}`} className="text-dark dark:text-white"><td className="px-2 py-1">{l.label}</td><td className="px-2 py-1">{money(l.rate)}</td><td className="px-2 py-1">{l.count ?? "—"}</td><td className="px-2 py-1">{money(l.subtotal)}</td></tr>
                                ))}
                                {rc.extras.map((e, j) => (
                                  <tr key={`e${j}`} className="text-dark dark:text-white"><td className="px-2 py-1">{e.label} (extra)</td><td className="px-2 py-1">{money(e.rate)}</td><td className="px-2 py-1">{e.qty ?? "—"}</td><td className="px-2 py-1">{money(e.subtotal)}</td></tr>
                                ))}
                                {rc.fuelLevy ? (
                                  <tr className="text-dark dark:text-white"><td className="px-2 py-1">Fuel levy</td><td className="px-2 py-1">—</td><td className="px-2 py-1">—</td><td className="px-2 py-1">{money(rc.fuelLevy)}</td></tr>
                                ) : null}
                                <tr className="font-semibold text-dark dark:text-white"><td className="px-2 py-1" colSpan={3}>Calculated total</td><td className="px-2 py-1">{money(calc)}</td></tr>
                                <tr className="font-semibold" style={{ color: sev.color }}><td className="px-2 py-1" colSpan={3}>Invoiced</td><td className="px-2 py-1">{money(inv)}</td></tr>
                              </tbody>
                            </table>
                            <div className="mt-2 text-xs text-dark-6 dark:text-dark-6">
                              Period: {text(r[F.period]) || "—"} · Provider: {text(r[F.provider]) || "—"}
                              {!link && <> · <span style={{ color: "#dc2626" }}>no invoice PDF on file (missing invoice)</span></>}
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

  if (deepIdentifier) return <AccountView token={token} utilityType={deepUtility} identifier={deepIdentifier} businessName={deepBusiness} />;
  if (picked) return <AccountView token={token} utilityType="Waste" identifier={picked.identifier} businessName={picked.businessName} onBack={() => setPicked(null)} />;
  return <MemberGate token={token} onPick={setPicked} />;
}
