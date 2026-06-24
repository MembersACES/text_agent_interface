"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Base2Defaults,
  DEFAULT_BASE2_DEFAULTS,
  mergeBase2Defaults,
} from "@/lib/base2-defaults";

function formatSaveError(data: {
  error?: string;
  details?: Array<{ path: string; message: string }>;
}): string {
  if (Array.isArray(data.details) && data.details.length > 0) {
    return data.details.map((d) => `${d.path}: ${d.message}`).join(" · ");
  }
  return data.error || "Save failed";
}

function NumInput({
  label,
  value,
  onChange,
  step = 0.01,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  hint?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-gray-600 dark:text-gray-400">{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2"
      />
      {hint ? <span className="mt-1 block text-xs italic text-gray-400">{hint}</span> : null}
    </label>
  );
}

function Section({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <div>
      <h4 className="mb-1 text-sm font-semibold text-dark dark:text-white">{title}</h4>
      {note ? <p className="mb-3 text-xs italic text-gray-500">{note}</p> : null}
      {children}
    </div>
  );
}

export function Base2ComparisonDefaultsEditor({
  onSaved,
}: {
  onSaved?: (defaults: Base2Defaults) => void;
}) {
  const [defaults, setDefaults] = useState<Base2Defaults>(DEFAULT_BASE2_DEFAULTS);
  const [generation, setGeneration] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/base2-comparison-defaults", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUsingFallback(true);
        setDefaults(DEFAULT_BASE2_DEFAULTS);
        setError(
          res.status === 503
            ? "Backend store not configured yet — showing built-in defaults (editing disabled)."
            : data.error || "Failed to load defaults — showing built-in defaults.",
        );
        return;
      }
      setUsingFallback(false);
      setDefaults(mergeBase2Defaults(data.defaults));
      setGeneration(data.generation ?? null);
    } catch {
      setUsingFallback(true);
      setDefaults(DEFAULT_BASE2_DEFAULTS);
      setError("Failed to load defaults — showing built-in defaults.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/base2-comparison-defaults", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaults, generation }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setError("Someone else edited this — reload and try again.");
        return;
      }
      if (!res.ok) {
        setError(formatSaveError(data));
        return;
      }
      const merged = mergeBase2Defaults(data.defaults);
      setDefaults(merged);
      setGeneration(data.generation ?? null);
      setMessage("Saved. Future Base 2 reviews will use these rates.");
      onSaved?.(merged);
    } catch {
      setError("Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Loading comparison defaults…</p>;
  }

  const ci = defaults.electricity.ci;
  const sme = defaults.electricity.sme;
  const gas = defaults.gas;

  const setCi = (patch: Partial<typeof ci>) =>
    setDefaults({ ...defaults, electricity: { ...defaults.electricity, ci: { ...ci, ...patch } } });
  const setCiNsw = (patch: Partial<typeof ci.nsw>) => setCi({ nsw: { ...ci.nsw, ...patch } });
  const setCiOther = (patch: Partial<typeof ci.other>) => setCi({ other: { ...ci.other, ...patch } });
  const setSme = (patch: Partial<typeof sme>) =>
    setDefaults({ ...defaults, electricity: { ...defaults.electricity, sme: { ...sme, ...patch } } });
  const setGas = (patch: Partial<typeof gas>) =>
    setDefaults({ ...defaults, gas: { ...gas, ...patch } });
  const setTier = (i: number, patch: Partial<(typeof gas.tiers)[number]>) => {
    const tiers = gas.tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t));
    setGas({ tiers });
  };

  return (
    <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-dark-3 dark:bg-gray-dark">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-dark dark:text-white">
            Comparison rates (offer benchmarks)
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            The offer/benchmark rates every new Base 2 review compares current invoices against.
            Version {defaults.version} · Updated {defaults.updatedAt}
            {defaults.updatedBy ? ` by ${defaults.updatedBy}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || usingFallback}
          title={usingFallback ? "Backend store not configured — saving disabled" : undefined}
          className="rounded-lg bg-[#5750F1] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save defaults"}
        </button>
      </div>

      {error && <p className="text-sm text-amber-600 dark:text-amber-400">{error}</p>}
      {message && <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p>}

      <Section
        title="C&I Electricity — by state (c/kWh)"
        note="The review picks NSW rates for NSW sites, otherwise the Other-states rates. Metering is a fixed annual benchmark."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-300">NSW</p>
            <div className="grid gap-2">
              <NumInput label="Peak" value={ci.nsw.peak} onChange={(v) => setCiNsw({ peak: v })} />
              <NumInput label="Shoulder" value={ci.nsw.shoulder} onChange={(v) => setCiNsw({ shoulder: v })} />
              <NumInput label="Off-peak" value={ci.nsw.offPeak} onChange={(v) => setCiNsw({ offPeak: v })} />
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-300">Other states</p>
            <div className="grid gap-2">
              <NumInput label="Peak" value={ci.other.peak} onChange={(v) => setCiOther({ peak: v })} />
              <NumInput label="Off-peak" value={ci.other.offPeak} onChange={(v) => setCiOther({ offPeak: v })} />
              <NumInput label="Shoulder (default)" value={ci.other.shoulderDefault} onChange={(v) => setCiOther({ shoulderDefault: v })} />
              <NumInput
                label="Shoulder when billed same as off-peak"
                value={ci.other.shoulderWhenSameAsOffPeak}
                onChange={(v) => setCiOther({ shoulderWhenSameAsOffPeak: v })}
              />
            </div>
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <NumInput label="Meter ($/yr)" value={ci.meterAnnual} onChange={(v) => setCi({ meterAnnual: v })} />
          <NumInput label="VAS ($/yr)" value={ci.vasAnnual} onChange={(v) => setCi({ vasAnnual: v })} />
        </div>
      </Section>

      <Section
        title="C&I Gas — by annual load ($/GJ benchmark)"
        note="The review picks the highest tier the site's annual GJ/year meets (annual = bill GJ × 365 ÷ billing days, or the entered annual consumption)."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {gas.tiers.map((t, i) => (
            <div key={i} className="rounded border border-gray-100 p-3 dark:border-dark-3">
              <p className="mb-2 text-xs font-medium text-gray-600">Tier {i + 1}</p>
              <NumInput label="From annual GJ/yr" value={t.minGj} step={1} onChange={(v) => setTier(i, { minGj: v })} />
              <div className="mt-2">
                <NumInput label="Benchmark ($/GJ)" value={t.benchmarkPerGj} onChange={(v) => setTier(i, { benchmarkPerGj: v })} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <NumInput label="SME flat fallback ($/GJ)" value={gas.ciComparisonPerGj} onChange={(v) => setGas({ ciComparisonPerGj: v })} hint="Used for SME gas only" />
          <NumInput label="Commission ($/GJ)" value={gas.commissionPerGj} onChange={(v) => setGas({ commissionPerGj: v })} />
          <NumInput label="Daily supply fallback ($/day)" value={gas.dailySupplyDefault} onChange={(v) => setGas({ dailySupplyDefault: v })} />
          <NumInput label="SME energy share" value={gas.smeEnergyShare} onChange={(v) => setGas({ smeEnergyShare: v })} />
          <NumInput label="Discount factor" value={gas.discountFactor} onChange={(v) => setGas({ discountFactor: v })} />
        </div>
      </Section>

      <Section title="SME Electricity" note="Offer = current × discount factor when a current rate exists; otherwise these fallback rates.">
        <div className="grid gap-3 sm:grid-cols-3">
          <NumInput label="Discount factor" value={sme.discountFactor} onChange={(v) => setSme({ discountFactor: v })} hint="e.g. 0.95 = 5% below current" />
          <NumInput label="Peak fallback (c/kWh)" value={sme.peakRateDefault} onChange={(v) => setSme({ peakRateDefault: v })} />
          <NumInput label="Off-peak fallback (c/kWh)" value={sme.offPeakRateDefault} onChange={(v) => setSme({ offPeakRateDefault: v })} />
          <NumInput label="Shoulder fallback (c/kWh)" value={sme.shoulderRateDefault} onChange={(v) => setSme({ shoulderRateDefault: v })} />
          <NumInput label="Metering ($/yr)" value={sme.meteringAnnual} onChange={(v) => setSme({ meteringAnnual: v })} />
          <NumInput label="Daily supply fallback ($/day)" value={sme.dailySupplyDefault} onChange={(v) => setSme({ dailySupplyDefault: v })} />
          <NumInput label="Demand fallback ($/kVA)" value={sme.demandChargeDefault} onChange={(v) => setSme({ demandChargeDefault: v })} />
        </div>
      </Section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Section title="Oil">
          <NumInput label="Comparison ($/L)" value={defaults.oil.comparisonPerL} onChange={(v) => setDefaults({ ...defaults, oil: { comparisonPerL: v } })} />
        </Section>
        <Section title="Waste">
          <NumInput label="Discount factor" value={defaults.waste.discountFactor} onChange={(v) => setDefaults({ ...defaults, waste: { discountFactor: v } })} hint="No fixed fallback — current × factor" />
        </Section>
        <Section title="Cleaning">
          <NumInput label="Discount factor" value={defaults.cleaning.discountFactor} onChange={(v) => setDefaults({ ...defaults, cleaning: { discountFactor: v } })} hint="No fixed fallback — current × factor" />
        </Section>
      </div>
    </div>
  );
}
