"use client";

import { useEffect, useState } from "react";
import { getApiBaseUrl } from "@/lib/utils";

export type BneGasMatchKind = "exact" | "checksum" | "one_digit" | "none";

export interface BneGasPeriod {
  period_name: string;
  period_start_date: string;
  period_end_date: string;
  energy_rate_per_gj: number | null;
  energy_rate_display: string;
  cpq_gj: number | null;
  maq_gj: number | null;
  maq_pct: number | null;
  mdq_gj_per_day: number | null;
  mhq_gj_per_hour: number | null;
  overrun_rate_per_gj: number | null;
  excess_cpq_rate_per_gj: number | null;
  veec_rate: number | null;
}

export interface BneGasContract {
  mrin: string;
  company_name: string;
  supply_address: string;
  contract_start_date: string;
  contract_end_date: string;
  retailer: string;
  webview_link: string;
  row_count: number;
  periods: BneGasPeriod[];
}

export interface BneGasContractResponse {
  query_mrin: string;
  normalized_mrin: string;
  match_kind: BneGasMatchKind;
  sheet_id: string;
  sheet_tab: string;
  contracts: BneGasContract[];
}

export interface BneGasPreview {
  currentGasRate: number | null;
  invoiceUsageGj: number | null;
  invoiceDays: number | null;
  newGasRate: number | null;
  commissionPerGj: number | null;
}

export interface BneGasGenerateValues {
  currentGasRate: number | null;
  invoiceUsageGj: number | null;
  invoiceDays: number | null;
  newGasRate: number | null;
  commissionPerGj: number | null;
  annualUsageGj: number | null;
  estimatedComms: number | null;
  contractEndDate: string;
  bneStartDate: string;
  bneEndDate: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

function numToInput(value: number | null | undefined): string {
  return value != null && Number.isFinite(value) ? String(value) : "";
}

function parseNum(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

function annualiseInvoiceUsage(usageGj: number | null, days: number | null): number | null {
  if (usageGj == null || days == null || days <= 0) return null;
  return (usageGj / days) * 365;
}

function fmtNum(value: number | null, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-AU", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function fmtWithUnit(value: number | null, unit: string, digits = 0): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${fmtNum(value, digits)} ${unit}`;
}

function fmtRate(value: number | null, display?: string, digits = 2): string {
  if (display) return display;
  if (value == null || !Number.isFinite(value)) return "—";
  return `${fmtNum(value, digits)} $/GJ`;
}

function fmtMoney(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
}

function firstOfNextMonthIso(from: Date = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth() + 1, 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toIsoDate(raw: string | undefined | null): string {
  const s = (raw || "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (!m) return "";
  const day = m[1].padStart(2, "0");
  const month = m[2].padStart(2, "0");
  let year = m[3];
  if (year.length === 2) year = `20${year}`;
  return `${year}-${month}-${day}`;
}

function toAuDate(raw: string | undefined | null): string {
  const iso = toIsoDate(raw);
  if (!iso) return (raw || "").trim();
  const [year, month, day] = iso.split("-");
  return `${Number(day)}/${Number(month)}/${year}`;
}

function firstOfNextMonthAu(from: Date = new Date()): string {
  return toAuDate(firstOfNextMonthIso(from));
}

function matchKindLabel(kind: BneGasMatchKind, invoiceMrin: string, sheetMrin: string): string {
  if (kind === "exact") return `Exact match for invoice MRIN ${invoiceMrin}`;
  if (kind === "checksum") {
    return `Matched sheet MRIN ${sheetMrin} from invoice ${invoiceMrin} (one trailing digit off)`;
  }
  if (kind === "one_digit") {
    return `Matched sheet MRIN ${sheetMrin} from invoice ${invoiceMrin} (last digit differs)`;
  }
  return `No signed C&I gas contract found for MRIN ${invoiceMrin} — enter the end date if you have it.`;
}

function PreviewField({
  id,
  label,
  value,
  onChange,
  suffix,
  step,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  step?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2.5">
      <label htmlFor={id} className="text-[11px] uppercase tracking-wide text-gray-400">{label}</label>
      <div className="mt-1 flex items-center gap-1.5">
        <input
          id={id}
          type="number"
          step={step ?? "0.01"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm font-semibold tabular-nums text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
        />
        {suffix ? <span className="text-xs text-gray-500 whitespace-nowrap">{suffix}</span> : null}
      </div>
      {hint ? <div className="mt-0.5 text-[11px] text-gray-400">{hint}</div> : null}
    </div>
  );
}

export function BneGasContractModal({
  open,
  mrin,
  token,
  preview,
  defaultContactName,
  defaultContactEmail,
  defaultContactPhone,
  onClose,
  onGenerate,
}: {
  open: boolean;
  mrin: string;
  token?: string;
  preview: BneGasPreview | null;
  defaultContactName?: string;
  defaultContactEmail?: string;
  defaultContactPhone?: string;
  onClose: () => void;
  onGenerate: (values: BneGasGenerateValues) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BneGasContractResponse | null>(null);
  const [contractDetailsOpen, setContractDetailsOpen] = useState(false);
  const [contractEndDate, setContractEndDate] = useState("");
  const [endDateTouched, setEndDateTouched] = useState(false);
  const [currentGasRate, setCurrentGasRate] = useState("");
  const [invoiceUsageGj, setInvoiceUsageGj] = useState("");
  const [invoiceDays, setInvoiceDays] = useState("");
  const [newGasRate, setNewGasRate] = useState("");
  const [commissionPerGj, setCommissionPerGj] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [bneStartDate, setBneStartDate] = useState("");
  const [bneEndDate, setBneEndDate] = useState("");

  useEffect(() => {
    if (!open) {
      setData(null);
      setError(null);
      setLoading(false);
      setContractDetailsOpen(false);
      setContractEndDate("");
      setEndDateTouched(false);
      setBneStartDate("");
      setBneEndDate("");
      return;
    }
    setCurrentGasRate(numToInput(preview?.currentGasRate));
    setInvoiceUsageGj(numToInput(preview?.invoiceUsageGj));
    setInvoiceDays(numToInput(preview?.invoiceDays));
    setNewGasRate(numToInput(preview?.newGasRate));
    setCommissionPerGj(numToInput(preview?.commissionPerGj));
    setContactName(defaultContactName ?? "");
    setContactEmail(defaultContactEmail ?? "");
    setContactPhone(defaultContactPhone ?? "");
    setBneStartDate(firstOfNextMonthAu());
    setBneEndDate("");
  }, [open, mrin, preview?.currentGasRate, preview?.invoiceUsageGj, preview?.invoiceDays, preview?.newGasRate, preview?.commissionPerGj, defaultContactName, defaultContactEmail, defaultContactPhone]);

  useEffect(() => {
    if (!open) return;
    if (!token || !mrin) {
      setError(null);
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      setData(null);
      try {
        const url = `${getApiBaseUrl()}/api/base2/bne-gas-contract?mrin=${encodeURIComponent(mrin)}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const payload = (await res.json()) as BneGasContractResponse & { detail?: unknown };
        if (!res.ok) {
          const detail = typeof payload.detail === "string" ? payload.detail : "Contract lookup failed";
          throw new Error(detail);
        }
        if (!cancelled) setData(payload);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Contract lookup failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [open, mrin, token]);

  const firstContract = data?.contracts[0];

  useEffect(() => {
    if (endDateTouched) return;
    const iso = toIsoDate(firstContract?.contract_end_date);
    if (iso) setContractEndDate(toAuDate(iso));
  }, [firstContract?.contract_end_date, endDateTouched]);

  const usageGj = parseNum(invoiceUsageGj);
  const days = parseNum(invoiceDays);
  const commission = parseNum(commissionPerGj);
  const annualUsageGj = annualiseInvoiceUsage(usageGj, days);
  const estimatedComms =
    annualUsageGj != null && commission != null ? annualUsageGj * commission : null;

  const generateValues = (): BneGasGenerateValues => ({
    currentGasRate: parseNum(currentGasRate),
    invoiceUsageGj: usageGj,
    invoiceDays: days,
    newGasRate: parseNum(newGasRate),
    commissionPerGj: commission,
    annualUsageGj,
    estimatedComms,
    contractEndDate: toIsoDate(contractEndDate),
    bneStartDate: toIsoDate(bneStartDate),
    bneEndDate: toIsoDate(bneEndDate),
    contactName: contactName.trim(),
    contactEmail: contactEmail.trim(),
    contactPhone: contactPhone.trim(),
  });

  if (!open) return null;

  const matchNote =
    data != null
      ? matchKindLabel(data.match_kind, data.query_mrin || mrin, firstContract?.mrin ?? "")
      : null;
  const hasContract = (data?.contracts.length ?? 0) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">B&E Gas</h3>
            <p className="text-xs font-mono text-gray-500 mt-0.5">Invoice MRIN {mrin}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Comparison preview</h4>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              <PreviewField
                id="bne-current-rate"
                label="Current gas rate"
                value={currentGasRate}
                onChange={setCurrentGasRate}
                suffix="$/GJ"
                step="0.0001"
              />
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2.5">
                <label htmlFor="bne-invoice-usage" className="text-[11px] uppercase tracking-wide text-gray-400">
                  Current invoice usage
                </label>
                <div className="mt-1 flex items-center gap-1.5">
                  <input
                    id="bne-invoice-usage"
                    type="number"
                    step="0.01"
                    value={invoiceUsageGj}
                    onChange={(e) => setInvoiceUsageGj(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm font-semibold tabular-nums text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                  <span className="text-xs text-gray-500 whitespace-nowrap">GJ</span>
                </div>
                <label htmlFor="bne-invoice-days" className="mt-2 block text-[11px] uppercase tracking-wide text-gray-400">
                  Invoice days
                </label>
                <input
                  id="bne-invoice-days"
                  type="number"
                  step="1"
                  value={invoiceDays}
                  onChange={(e) => setInvoiceDays(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm font-semibold tabular-nums text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
              <PreviewField
                id="bne-new-rate"
                label="New gas rate"
                value={newGasRate}
                onChange={setNewGasRate}
                suffix="$/GJ"
                step="0.01"
              />
              <PreviewField
                id="bne-commission"
                label="Commission"
                value={commissionPerGj}
                onChange={setCommissionPerGj}
                suffix="$/GJ"
                step="0.01"
              />
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2.5">
                <div className="text-[11px] uppercase tracking-wide text-gray-400">Estimated comms</div>
                <div className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                  {fmtMoney(estimatedComms)}
                </div>
                <div className="mt-0.5 text-[11px] text-gray-400">
                  {annualUsageGj != null && commission != null
                    ? `${fmtNum(usageGj, 2)} GJ / ${fmtNum(days, 0)} d × 365 × ${fmtNum(commission, 2)} $/GJ`
                    : "Needs invoice usage and days"}
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2.5">
                <label htmlFor="bne-contract-end" className="text-[11px] uppercase tracking-wide text-gray-400">
                  Current end date
                </label>
                <input
                  id="bne-contract-end"
                  type="text"
                  placeholder="31/8/2029"
                  value={contractEndDate}
                  onChange={(e) => {
                    setEndDateTouched(true);
                    setContractEndDate(e.target.value);
                  }}
                  onBlur={() => {
                    const au = toAuDate(contractEndDate);
                    if (au) setContractEndDate(au);
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
                <div className="mt-0.5 text-[11px] text-gray-400">
                  {loading
                    ? "Checking signed contract…"
                    : firstContract?.contract_end_date && !endDateTouched
                      ? "Filled from signed contract — edit if needed"
                      : "Editable if no contract was found"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">B&E period</h4>
            <p className="text-xs text-gray-500 mb-3">Start defaults to the 1st of next month. Paste dates like 31/8/2029.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="bne-period-start" className="block text-[11px] uppercase tracking-wide text-gray-400 mb-1">
                  B&E start date
                </label>
                <input
                  id="bne-period-start"
                  type="text"
                  placeholder="1/9/2026"
                  value={bneStartDate}
                  onChange={(e) => setBneStartDate(e.target.value)}
                  onBlur={() => {
                    const au = toAuDate(bneStartDate);
                    if (au) setBneStartDate(au);
                  }}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
              <div>
                <label htmlFor="bne-period-end" className="block text-[11px] uppercase tracking-wide text-gray-400 mb-1">
                  B&E end date
                </label>
                <input
                  id="bne-period-end"
                  type="text"
                  placeholder="31/8/2029"
                  value={bneEndDate}
                  onChange={(e) => setBneEndDate(e.target.value)}
                  onBlur={() => {
                    const au = toAuDate(bneEndDate);
                    if (au) setBneEndDate(au);
                  }}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
              Contract lookup failed ({error}). You can still enter the end date and continue.
            </div>
          )}

          {!loading && !error && data && data.match_kind === "none" && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
              {matchNote}
            </div>
          )}

          {!loading && !error && hasContract && matchNote && (
            <div
              className={
                data?.match_kind === "exact"
                  ? "rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-4 py-2.5 text-sm text-emerald-800 dark:text-emerald-200"
                  : "rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-200"
              }
            >
              {matchNote}
              {(data?.contracts.length ?? 0) > 1 ? ` · ${data?.contracts.length} MRINs matched` : ""}
            </div>
          )}

          {hasContract && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button
                type="button"
                onClick={() => setContractDetailsOpen((openNow) => !openNow)}
                className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800"
                aria-expanded={contractDetailsOpen}
              >
                <span>Signed contract details</span>
                <span className="text-xs font-medium text-gray-500">{contractDetailsOpen ? "Hide" : "Show"}</span>
              </button>

              {contractDetailsOpen &&
                data?.contracts.map((contract) => (
                  <div key={contract.mrin} className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-3">
                    <div className="grid gap-2 sm:grid-cols-2 text-sm">
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-gray-400">Company</div>
                        <div className="font-medium text-gray-900 dark:text-white">{contract.company_name || "—"}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-gray-400">Sheet MRIN</div>
                        <div className="font-mono text-gray-900 dark:text-white">{contract.mrin}</div>
                      </div>
                      <div className="sm:col-span-2">
                        <div className="text-[11px] uppercase tracking-wide text-gray-400">Supply address</div>
                        <div className="text-gray-800 dark:text-gray-200">{contract.supply_address || "—"}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-gray-400">Contract dates</div>
                        <div className="text-gray-800 dark:text-gray-200">
                          {contract.contract_start_date || "—"} → {contract.contract_end_date || "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-gray-400">Retailer</div>
                        <div className="text-gray-800 dark:text-gray-200">{contract.retailer || "—"}</div>
                      </div>
                      {contract.webview_link && (
                        <div className="sm:col-span-2">
                          <a
                            href={contract.webview_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium underline"
                            style={{ color: "#0F766E" }}
                          >
                            Open signed contract
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr style={{ backgroundColor: "#0F766E" }}>
                            <th className="px-3 py-2.5 text-left text-xs font-semibold text-white/90 uppercase tracking-wide">Period</th>
                            <th className="px-3 py-2.5 text-left text-xs font-semibold text-white/90 uppercase tracking-wide">Dates</th>
                            <th className="px-3 py-2.5 text-right text-xs font-semibold text-white/90 uppercase tracking-wide">Energy rate</th>
                            <th className="px-3 py-2.5 text-right text-xs font-semibold text-white/90 uppercase tracking-wide">CPQ</th>
                            <th className="px-3 py-2.5 text-right text-xs font-semibold text-white/90 uppercase tracking-wide">MAQ</th>
                            <th className="px-3 py-2.5 text-right text-xs font-semibold text-white/90 uppercase tracking-wide">MDQ</th>
                            <th className="px-3 py-2.5 text-right text-xs font-semibold text-white/90 uppercase tracking-wide">Overrun</th>
                            <th className="px-3 py-2.5 text-right text-xs font-semibold text-white/90 uppercase tracking-wide">Excess CPQ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {contract.periods.map((period, index) => (
                            <tr key={`${period.period_name}-${index}`} className="border-t border-gray-100 dark:border-gray-800">
                              <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                {period.period_name || `Period ${index + 1}`}
                              </td>
                              <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                {period.period_start_date || "—"} → {period.period_end_date || "—"}
                              </td>
                              <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-gray-900 dark:text-white whitespace-nowrap">
                                {fmtRate(period.energy_rate_per_gj, period.energy_rate_display)}
                              </td>
                              <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                {fmtWithUnit(period.cpq_gj, "GJ", 0)}
                              </td>
                              <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                {period.maq_gj == null
                                  ? "—"
                                  : `${fmtNum(period.maq_gj, 0)} GJ${period.maq_pct != null ? ` (${fmtNum(period.maq_pct, 0)}%)` : ""}`}
                              </td>
                              <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                {fmtWithUnit(period.mdq_gj_per_day, "GJ/day", 0)}
                              </td>
                              <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                {period.overrun_rate_per_gj != null ? `${fmtNum(period.overrun_rate_per_gj, 2)} $/GJ` : "—"}
                              </td>
                              <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                {period.excess_cpq_rate_per_gj != null ? `${fmtNum(period.excess_cpq_rate_per_gj, 2)} $/GJ` : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
          <div>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">Send comparison to</p>
            <p className="text-[11px] text-gray-500 mb-2">
              Voice follow-up will call this mobile — use your own number when testing.
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                id="bne-contact-name"
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                placeholder="Contact name"
                autoComplete="name"
              />
              <input
                id="bne-contact-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                placeholder="name@example.com"
                autoComplete="email"
              />
              <input
                id="bne-contact-phone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                placeholder="04…"
                autoComplete="tel"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              const values = generateValues();
              if (!values.contactEmail) {
                alert("Enter a contact email — this is who the B&E comparison is sent to.");
                return;
              }
              if (!values.contactPhone) {
                alert("Enter a mobile — this is the number the voice follow-up will call.");
                return;
              }
              onGenerate(values);
            }}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: "#0F766E" }}
          >
            Generate comparison
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}
