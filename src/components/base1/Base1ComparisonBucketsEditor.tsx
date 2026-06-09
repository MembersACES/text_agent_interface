"use client";

import { useCallback, useEffect, useState } from "react";

interface GasTier {
  minGj: number;
  maxGj: number | null;
  benchmarkPerGj: number;
}

interface BucketsPayload {
  version: number;
  updatedAt: string;
  updatedBy?: string;
  thresholds: {
    minAnnualSavingsAud: number;
    highSeverityMinSavingsAud: number;
    highSeverityRateGapCPerKwh: number;
  };
  gas: {
    minAnnualUsageGj: number;
    bundledEnergyMultiplier: number;
    tiers: GasTier[];
  };
  electricity: {
    retailTou: {
      nsw: { peakCPerKwh: number; shoulderCPerKwh: number; offPeakCPerKwh: number };
      other: {
        peakCPerKwh: number;
        offPeakCPerKwh: number;
        shoulderDefaultCPerKwh: number;
        shoulderWhenSameAsOffPeakCPerKwh: number;
        shoulderSameAsOffPeakTolerance: number;
      };
    };
    metering: {
      noFindingMaxAnnual: number;
      midTierMaxAnnual: number;
      midTierComparisonAnnual: number;
      highTierComparisonAnnual: number;
      highSeverityMinAnnual: number;
    };
    demand: { minRelativeOverstatement: number };
  };
}

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
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
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
    </label>
  );
}

export function Base1ComparisonBucketsEditor() {
  const [buckets, setBuckets] = useState<BucketsPayload | null>(null);
  const [generation, setGeneration] = useState<string>("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/base1-comparison-buckets", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load buckets");
        return;
      }
      setBuckets(data.buckets);
      setGeneration(data.generation ?? "0");
    } catch {
      setError("Failed to load comparison buckets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!buckets) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/base1-comparison-buckets", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buckets, generation }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setError("Someone else edited this — reload and try again.");
        return;
      }
      if (!res.ok) {
        setError(formatSaveError(data));
        return;
      }
      setBuckets(data.buckets);
      setGeneration(data.generation);
      setMessage("Saved successfully.");
    } catch {
      setError("Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Loading comparison buckets…</p>;
  }
  if (!buckets) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-700 dark:bg-amber-900/20">
        {error ?? "Could not load buckets."}
        <button type="button" onClick={() => void load()} className="ml-2 underline">
          Retry
        </button>
      </div>
    );
  }

  const nsw = buckets.electricity.retailTou.nsw;
  const other = buckets.electricity.retailTou.other;
  const m = buckets.electricity.metering;

  return (
    <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-dark-3 dark:bg-gray-dark">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-dark dark:text-white">
            Comparison buckets
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Version {buckets.version} · Updated {buckets.updatedAt}
            {buckets.updatedBy ? ` by ${buckets.updatedBy}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="rounded-lg bg-[#2d6b5a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a4d3e] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save buckets"}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {message && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <NumInput
          label="Min annual savings ($)"
          value={buckets.thresholds.minAnnualSavingsAud}
          onChange={(v) =>
            setBuckets({ ...buckets, thresholds: { ...buckets.thresholds, minAnnualSavingsAud: v } })
          }
        />
        <NumInput
          label="High severity min savings ($)"
          value={buckets.thresholds.highSeverityMinSavingsAud}
          onChange={(v) =>
            setBuckets({
              ...buckets,
              thresholds: { ...buckets.thresholds, highSeverityMinSavingsAud: v },
            })
          }
        />
        <NumInput
          label="High severity rate gap (c/kWh)"
          value={buckets.thresholds.highSeverityRateGapCPerKwh}
          onChange={(v) =>
            setBuckets({
              ...buckets,
              thresholds: { ...buckets.thresholds, highSeverityRateGapCPerKwh: v },
            })
          }
        />
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold">Gas tiers (annual GJ/year)</h4>
        <p className="mb-3 text-xs italic text-gray-500">
          Tier from/to values are annual GJ per year (period usage × 365 ÷ billing days), not GJ on
          this bill.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <NumInput
            label="Min annual usage gate (GJ)"
            value={buckets.gas.minAnnualUsageGj}
            onChange={(v) => setBuckets({ ...buckets, gas: { ...buckets.gas, minAnnualUsageGj: v } })}
          />
          <NumInput
            label="Bundled energy multiplier"
            value={buckets.gas.bundledEnergyMultiplier}
            step={0.01}
            onChange={(v) =>
              setBuckets({ ...buckets, gas: { ...buckets.gas, bundledEnergyMultiplier: v } })
            }
          />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {buckets.gas.tiers.map((tier, i) => (
            <div key={i} className="rounded border border-gray-100 p-3 dark:border-dark-3">
              <p className="mb-2 text-xs font-medium text-gray-600">Tier {i + 1}</p>
              <NumInput
                label="Min annual GJ"
                value={tier.minGj}
                onChange={(v) => {
                  const tiers = [...buckets.gas.tiers];
                  tiers[i] = { ...tier, minGj: v };
                  setBuckets({ ...buckets, gas: { ...buckets.gas, tiers } });
                }}
              />
              <div className="mt-2">
                <NumInput
                  label="Benchmark ($/GJ)"
                  value={tier.benchmarkPerGj}
                  onChange={(v) => {
                    const tiers = [...buckets.gas.tiers];
                    tiers[i] = { ...tier, benchmarkPerGj: v };
                    setBuckets({ ...buckets, gas: { ...buckets.gas, tiers } });
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h4 className="mb-2 text-sm font-semibold">NSW TOU (c/kWh)</h4>
          <div className="grid gap-2">
            <NumInput label="Peak" value={nsw.peakCPerKwh} onChange={(v) =>
              setBuckets({
                ...buckets,
                electricity: {
                  ...buckets.electricity,
                  retailTou: { ...buckets.electricity.retailTou, nsw: { ...nsw, peakCPerKwh: v } },
                },
              })
            } />
            <NumInput label="Shoulder" value={nsw.shoulderCPerKwh} onChange={(v) =>
              setBuckets({
                ...buckets,
                electricity: {
                  ...buckets.electricity,
                  retailTou: { ...buckets.electricity.retailTou, nsw: { ...nsw, shoulderCPerKwh: v } },
                },
              })
            } />
            <NumInput label="Off-peak" value={nsw.offPeakCPerKwh} onChange={(v) =>
              setBuckets({
                ...buckets,
                electricity: {
                  ...buckets.electricity,
                  retailTou: { ...buckets.electricity.retailTou, nsw: { ...nsw, offPeakCPerKwh: v } },
                },
              })
            } />
          </div>
        </div>
        <div>
          <h4 className="mb-2 text-sm font-semibold">Other states TOU (c/kWh)</h4>
          <p className="mb-2 text-xs italic text-gray-500">
            If shoulder is billed at the same rate as off-peak (within tolerance), use the off-peak
            comparison rate for shoulder; otherwise use the default shoulder comparison rate.
          </p>
          <div className="grid gap-2">
            <NumInput label="Peak" value={other.peakCPerKwh} onChange={(v) =>
              setBuckets({
                ...buckets,
                electricity: {
                  ...buckets.electricity,
                  retailTou: {
                    ...buckets.electricity.retailTou,
                    other: { ...other, peakCPerKwh: v },
                  },
                },
              })
            } />
            <NumInput label="Off-peak" value={other.offPeakCPerKwh} onChange={(v) =>
              setBuckets({
                ...buckets,
                electricity: {
                  ...buckets.electricity,
                  retailTou: {
                    ...buckets.electricity.retailTou,
                    other: { ...other, offPeakCPerKwh: v },
                  },
                },
              })
            } />
            <NumInput label="Shoulder default" value={other.shoulderDefaultCPerKwh} onChange={(v) =>
              setBuckets({
                ...buckets,
                electricity: {
                  ...buckets.electricity,
                  retailTou: {
                    ...buckets.electricity.retailTou,
                    other: { ...other, shoulderDefaultCPerKwh: v },
                  },
                },
              })
            } />
            <NumInput
              label="Shoulder when same as off-peak"
              value={other.shoulderWhenSameAsOffPeakCPerKwh}
              onChange={(v) =>
                setBuckets({
                  ...buckets,
                  electricity: {
                    ...buckets.electricity,
                    retailTou: {
                      ...buckets.electricity.retailTou,
                      other: { ...other, shoulderWhenSameAsOffPeakCPerKwh: v },
                    },
                  },
                })
              }
            />
          </div>
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold">Metering & demand</h4>
        <div className="grid gap-3 sm:grid-cols-3">
          <NumInput label="No finding max ($/yr)" value={m.noFindingMaxAnnual} onChange={(v) =>
            setBuckets({
              ...buckets,
              electricity: {
                ...buckets.electricity,
                metering: { ...m, noFindingMaxAnnual: v },
              },
            })
          } />
          <NumInput label="Mid tier comparison ($/yr)" value={m.midTierComparisonAnnual} onChange={(v) =>
            setBuckets({
              ...buckets,
              electricity: {
                ...buckets.electricity,
                metering: { ...m, midTierComparisonAnnual: v },
              },
            })
          } />
          <NumInput label="High tier comparison ($/yr)" value={m.highTierComparisonAnnual} onChange={(v) =>
            setBuckets({
              ...buckets,
              electricity: {
                ...buckets.electricity,
                metering: { ...m, highTierComparisonAnnual: v },
              },
            })
          } />
          <NumInput
            label="Demand min overstatement (ratio)"
            value={buckets.electricity.demand.minRelativeOverstatement}
            step={0.01}
            onChange={(v) =>
              setBuckets({
                ...buckets,
                electricity: {
                  ...buckets.electricity,
                  demand: { minRelativeOverstatement: v },
                },
              })
            }
          />
        </div>
      </div>
    </div>
  );
}
