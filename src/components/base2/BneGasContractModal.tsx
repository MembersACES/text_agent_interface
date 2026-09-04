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

export type CiGasContractModalMode = "bne" | "future";

const FUTURE_DEFAULT_OFFER_RATE = 16.8;
const FUTURE_DEFAULT_COMMISSION = 3.9;
const FUTURE_DEFAULT_END_DATE_AU = "31/12/2029";

export interface BneGasGenerateValues {
  currentGasRate: number | null;
  invoiceUsageGj: number | null;
  invoiceDays: number | null;
  newGasRate: number | null;
  commissionPerGj: number | null;
  annualUsageGj: number | null;
  estimatedComms: number | null;
  contractEndDate: string;
  periodStartDate: string;
  periodEndDate: string;
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

function dayAfterIso(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayAfterAu(raw: string | undefined | null): string {
  const iso = toIsoDate(raw);
  if (!iso) return "";
  return toAuDate(dayAfterIso(iso));
}

function periodCalendarIso(period: BneGasPeriod): string {
  return toIsoDate(period.period_end_date) || toIsoDate(period.period_start_date) || "";
}

function periodsLatestFirst(periods: BneGasPeriod[]): BneGasPeriod[] {
  return [...periods].sort((a, b) => periodCalendarIso(b).localeCompare(periodCalendarIso(a)));
}

function lastPeriodContractedRate(contract: BneGasContract | undefined): number | null {
  const periods = contract?.periods ?? [];
  for (const period of periodsLatestFirst(periods)) {
    const rate = period.energy_rate_per_gj;
    if (rate != null && Number.isFinite(rate)) return rate;
  }
  return null;
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
  focusRingClass,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  step?: string;
  hint?: string;
  focusRingClass: string;
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
          className={`w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm font-semibold tabular-nums text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${focusRingClass}`}
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
  mode = "bne",
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
  mode?: CiGasContractModalMode;
  defaultContactName?: string;
  defaultContactEmail?: string;
  defaultContactPhone?: string;
  onClose: () => void;
  onGenerate: (values: BneGasGenerateValues) => void;
}) {
  const isFuture = mode === "future";
  const accent = isFuture ? "#4338CA" : "#0F766E";
  const focusRingClass = isFuture ? "focus:ring-indigo-600" : "focus:ring-teal-600";
  const title = isFuture ? "Future Contract" : "B&E Gas";
  const comparisonLabel = isFuture ? "Future Contract" : "B&E";

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
  const [periodStartDate, setPeriodStartDate] = useState("");
  const [periodEndDate, setPeriodEndDate] = useState("");
  const [startDateTouched, setStartDateTouched] = useState(false);
  const [currentRateTouched, setCurrentRateTouched] = useState(false);

  useEffect(() => {
    if (!open) {
      setData(null);
      setError(null);
      setLoading(false);
      setContractDetailsOpen(false);
      setContractEndDate("");
      setEndDateTouched(false);
      setPeriodStartDate("");
      setPeriodEndDate("");
      setStartDateTouched(false);
      setCurrentRateTouched(false);
      return;
    }
    setInvoiceUsageGj(numToInput(preview?.invoiceUsageGj));
    setInvoiceDays(numToInput(preview?.invoiceDays));
    setNewGasRate(isFuture ? numToInput(FUTURE_DEFAULT_OFFER_RATE) : numToInput(preview?.newGasRate));
    setCommissionPerGj(isFuture ? numToInput(FUTURE_DEFAULT_COMMISSION) : numToInput(preview?.commissionPerGj));
    setContactName(defaultContactName ?? "");
    setContactEmail(defaultContactEmail ?? "");
    setContactPhone(defaultContactPhone ?? "");
    setStartDateTouched(false);
    setPeriodStartDate(isFuture ? "" : firstOfNextMonthAu());
    setPeriodEndDate(isFuture ? FUTURE_DEFAULT_END_DATE_AU : "");
    setCurrentRateTouched(false);
  }, [open, mrin, mode, isFuture, preview?.invoiceUsageGj, preview?.invoiceDays, preview?.newGasRate, preview?.commissionPerGj, defaultContactName, defaultContactEmail, defaultContactPhone]);

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
  const contractedRate = lastPeriodContractedRate(firstContract);

  useEffect(() => {
    if (!open || currentRateTouched) return;
    if (contractedRate != null) {
      setCurrentGasRate(numToInput(contractedRate));
      return;
    }
    setCurrentGasRate(numToInput(preview?.currentGasRate));
  }, [open, currentRateTouched, contractedRate, preview?.currentGasRate]);

  useEffect(() => {
    if (endDateTouched) return;
    const iso = toIsoDate(firstContract?.contract_end_date);
    if (iso) setContractEndDate(toAuDate(iso));
  }, [firstContract?.contract_end_date, endDateTouched]);

  useEffect(() => {
    if (!open || !isFuture || startDateTouched) return;
    const nextStart = dayAfterAu(contractEndDate);
    if (nextStart) setPeriodStartDate(nextStart);
  }, [open, isFuture, contractEndDate, startDateTouched]);

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
    periodStartDate: toIsoDate(periodStartDate),
    periodEndDate: toIsoDate(periodEndDate),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" aria-modal="true" role="dialog" aria-busy={loading}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-xs font-mono text-gray-500 mt-0.5">Invoice MRIN {mrin}</p>
          </div>
          <div className="flex items-center gap-2">
            {loading && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium text-white" style={{ backgroundColor: accent }}>
                <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Looking up contract…
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>
        {loading && (
          <div className="h-0.5 w-full overflow-hidden" style={{ backgroundColor: `${accent}22` }} aria-hidden="true">
            <div className="h-full w-1/3 animate-pulse" style={{ backgroundColor: accent }} />
          </div>
        )}

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {loading && (
            <div
              className="flex items-center gap-3 rounded-xl border px-4 py-3"
              style={{ borderColor: `${accent}55`, backgroundColor: `${accent}12` }}
            >
              <svg className="animate-spin h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden="true" style={{ color: accent }}>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Looking up signed contract</p>
                <p className="text-xs text-gray-500">Checking the C&amp;I Gas sheet for this MRIN. Current rate and end date will fill when it returns.</p>
              </div>
            </div>
          )}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Comparison preview</h4>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              <PreviewField
                id="bne-current-rate"
                label="Current gas rate"
                value={currentGasRate}
                onChange={(v) => {
                  setCurrentRateTouched(true);
                  setCurrentGasRate(v);
                }}
                suffix="$/GJ"
                step="0.0001"
                focusRingClass={focusRingClass}
                hint={
                  loading
                    ? "Checking signed contract…"
                    : contractedRate != null
                      ? "Last period contracted rate from the sheet — edit if needed"
                      : "From the invoice — no contracted rate found on the sheet"
                }
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
                    className={`w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm font-semibold tabular-nums text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${focusRingClass}`}
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
                  className={`mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm font-semibold tabular-nums text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${focusRingClass}`}
                />
              </div>
              <PreviewField
                id="bne-new-rate"
                label="New gas rate"
                value={newGasRate}
                onChange={setNewGasRate}
                suffix="$/GJ"
                step="0.01"
                focusRingClass={focusRingClass}
              />
              <PreviewField
                id="bne-commission"
                label="Commission"
                value={commissionPerGj}
                onChange={setCommissionPerGj}
                suffix="$/GJ"
                step="0.01"
                focusRingClass={focusRingClass}
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
                  className={`mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${focusRingClass}`}
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
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              {isFuture ? "Future contract period" : "B&E period"}
            </h4>
            <p className="text-xs text-gray-500 mb-3">
              {isFuture
                ? "Start defaults to the day after the current contract ends. End defaults to 31/12/2029. Paste dates like 31/8/2029."
                : "Start defaults to the 1st of next month. Paste dates like 31/8/2029."}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="bne-period-start" className="block text-[11px] uppercase tracking-wide text-gray-400 mb-1">
                  {isFuture ? "Future start date" : "B&E start date"}
                </label>
                <input
                  id="bne-period-start"
                  type="text"
                  placeholder={isFuture ? "1/9/2029" : "1/9/2026"}
                  value={periodStartDate}
                  onChange={(e) => {
                    setStartDateTouched(true);
                    setPeriodStartDate(e.target.value);
                  }}
                  onBlur={() => {
                    const au = toAuDate(periodStartDate);
                    if (au) setPeriodStartDate(au);
                  }}
                  className={`w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${focusRingClass}`}
                />
              </div>
              <div>
                <label htmlFor="bne-period-end" className="block text-[11px] uppercase tracking-wide text-gray-400 mb-1">
                  {isFuture ? "Future end date" : "B&E end date"}
                </label>
                <input
                  id="bne-period-end"
                  type="text"
                  placeholder={isFuture ? "31/12/2029" : "31/8/2029"}
                  value={periodEndDate}
                  onChange={(e) => setPeriodEndDate(e.target.value)}
                  onBlur={() => {
                    const au = toAuDate(periodEndDate);
                    if (au) setPeriodEndDate(au);
                  }}
                  className={`w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${focusRingClass}`}
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

          {loading && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Signed contract details</span>
                <span className="text-xs font-medium text-gray-400">Loading…</span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-3 animate-pulse">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="h-10 rounded-lg bg-gray-100 dark:bg-gray-800" />
                  <div className="h-10 rounded-lg bg-gray-100 dark:bg-gray-800" />
                  <div className="h-10 rounded-lg bg-gray-100 dark:bg-gray-800 sm:col-span-2" />
                </div>
                <div className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800" />
              </div>
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
                            style={{ color: accent }}
                          >
                            Open signed contract
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr style={{ backgroundColor: accent }}>
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
                          {periodsLatestFirst(contract.periods).map((period, index) => (
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
                className={`w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${focusRingClass}`}
                placeholder="Contact name"
                autoComplete="name"
              />
              <input
                id="bne-contact-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className={`w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${focusRingClass}`}
                placeholder="name@example.com"
                autoComplete="email"
              />
              <input
                id="bne-contact-phone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className={`w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${focusRingClass}`}
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
                alert(`Enter a contact email — this is who the ${comparisonLabel} comparison is sent to.`);
                return;
              }
              if (!values.contactPhone) {
                alert("Enter a mobile — this is the number the voice follow-up will call.");
                return;
              }
              if (isFuture && !values.periodStartDate) {
                alert("Enter a future contract start date (after the current contract ends).");
                return;
              }
              if (
                isFuture &&
                values.periodStartDate &&
                values.contractEndDate &&
                values.periodStartDate <= values.contractEndDate
              ) {
                alert("Future contract start must be after the current contract end date.");
                return;
              }
              onGenerate(values);
            }}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: accent }}
          >
            Generate comparison
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}
