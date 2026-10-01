"use client";

import React from "react";
import {
  priceSmeElectricity,
  smeElecBillCheck,
  SME_ELEC_MAX_USAGE_LINES,
  type SmeElecBillAmount,
  type SmeElecDemandLine,
  type SmeElecOfferDraft,
  type SmeElecUsageLine,
} from "@/lib/sme-electricity-offer";

const inputCls =
  "w-full min-w-[5.5rem] rounded border border-gray-300 bg-white px-1.5 py-1 text-right font-mono text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-indigo-400";

function parseOptional(raw: string): number | undefined {
  if (raw.trim() === "") return undefined;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : undefined;
}

function parseRate(raw: string): number {
  const n = parseOptional(raw);
  return n != null && n > 0 ? n : 0;
}

function aud(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
}

function AmountCell({ amount }: { amount: SmeElecBillAmount | undefined }) {
  if (!amount || amount.dollars == null) {
    return <div className="text-right text-[11px] text-gray-400">—</div>;
  }
  return (
    <div className="text-right">
      {amount.working && <div className="text-[10px] leading-snug text-gray-500">{amount.working}</div>}
      <div className="font-mono text-xs font-semibold tabular-nums text-gray-900">{aud(amount.dollars)}</div>
    </div>
  );
}

export function SmeElecOfferTable({
  draft,
  onChange,
}: {
  draft: SmeElecOfferDraft;
  onChange: (next: SmeElecOfferDraft) => void;
}) {
  const priced = priceSmeElectricity(draft);
  const bill = smeElecBillCheck(draft);
  const patch = (next: SmeElecOfferDraft) => onChange(next);
  const currentAmount = (id: string) => bill.currentLines.find((line) => line.id === id);
  const offerAmount = (id: string) => bill.offerLines.find((line) => line.id === id);

  const editLine = (id: string, field: keyof Pick<SmeElecUsageLine, "kwh" | "currentCPerKwh" | "offerCPerKwh">, raw: string) => {
    patch({
      ...draft,
      usageLines: draft.usageLines.map((line) => {
        if (line.id !== id) return line;
        if (field === "offerCPerKwh") return { ...line, offerCPerKwh: parseRate(raw) };
        if (field === "kwh") return { ...line, kwh: parseOptional(raw) ?? 0 };
        return { ...line, currentCPerKwh: parseOptional(raw) };
      }),
    });
  };

  const editDemand = (id: string, field: keyof Pick<SmeElecDemandLine, "quantity" | "currentRate" | "offerRate">, raw: string) => {
    patch({
      ...draft,
      demandLines: draft.demandLines.map((line) => {
        if (line.id !== id) return line;
        if (field === "offerRate") return { ...line, offerRate: parseRate(raw) };
        if (field === "quantity") return { ...line, quantity: parseOptional(raw) ?? 0 };
        return { ...line, currentRate: parseOptional(raw) };
      }),
    });
  };

  return (
    <div className="mt-3 space-y-3">
      <p className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 leading-snug text-indigo-950">
        SME vs SME. Offer rates are typed in. Nothing is filled from a discount or a default c/kWh.
        {draft.retailer ? ` Retailer: ${draft.retailer}.` : ""}
        {draft.tariffType ? ` Tariff: ${draft.tariffType}.` : ""}
        {draft.invoiceReviewPeriod ? ` Period: ${draft.invoiceReviewPeriod}.` : ""}
      </p>
      {draft.usageLineOverflow && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-900">
          This bill has {draft.usageLines.length} usage lines. SME vs SME supports at most {SME_ELEC_MAX_USAGE_LINES}. Generate is blocked.
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="text-[11px] text-gray-600">
          Bill kWh
          <input
            type="number"
            step="0.001"
            className={`${inputCls} mt-1`}
            value={draft.billKwh || ""}
            onChange={(e) => patch({ ...draft, billKwh: parseOptional(e.target.value) ?? 0 })}
          />
        </label>
        <label className="text-[11px] text-gray-600">
          Annual kWh
          <input
            type="number"
            step="0.001"
            className={`${inputCls} mt-1`}
            value={draft.annualUsageKwh ?? ""}
            onChange={(e) => patch({ ...draft, annualUsageKwh: parseOptional(e.target.value) })}
          />
        </label>
        <label className="text-[11px] text-gray-600">
          Invoice days
          <input
            type="number"
            step="1"
            className={`${inputCls} mt-1`}
            value={draft.invoiceReviewDays ?? ""}
            onChange={(e) => patch({ ...draft, invoiceReviewDays: parseOptional(e.target.value) })}
          />
        </label>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2">Charge</th>
              <th className="px-3 py-2 text-right">Bill quantity</th>
              <th className="px-3 py-2 text-right">Current rate</th>
              <th className="px-3 py-2 text-right">Current $</th>
              <th className="px-3 py-2 text-right">Offer rate</th>
              <th className="px-3 py-2 text-right">Offer $</th>
            </tr>
          </thead>
          <tbody>
            {draft.usageLines.map((line) => (
              <tr key={line.id} className="border-t border-gray-100">
                <td className="px-3 py-2 font-medium text-gray-800">{line.label}</td>
                <td className="px-3 py-2">
                  <input type="number" step="0.001" className={inputCls} value={line.kwh || ""} onChange={(e) => editLine(line.id, "kwh", e.target.value)} aria-label={`${line.label} kWh`} />
                  <div className="mt-0.5 text-right text-[10px] text-gray-400">kWh</div>
                </td>
                <td className="px-3 py-2">
                  <input type="number" step="0.001" className={inputCls} value={line.currentCPerKwh ?? ""} onChange={(e) => editLine(line.id, "currentCPerKwh", e.target.value)} aria-label={`${line.label} current c/kWh`} />
                  <div className="mt-0.5 text-right text-[10px] text-gray-400">c/kWh</div>
                </td>
                <td className="px-3 py-2 align-top"><AmountCell amount={currentAmount(line.id)} /></td>
                <td className="px-3 py-2">
                  <input type="number" step="0.001" className={inputCls} value={line.offerCPerKwh || ""} onChange={(e) => editLine(line.id, "offerCPerKwh", e.target.value)} aria-label={`${line.label} offer c/kWh`} placeholder="0" />
                  <div className="mt-0.5 text-right text-[10px] text-gray-400">c/kWh</div>
                </td>
                <td className="px-3 py-2 align-top"><AmountCell amount={offerAmount(line.id)} /></td>
              </tr>
            ))}
            {draft.dailySupply && (
              <tr className="border-t border-gray-100">
                <td className="px-3 py-2 font-medium text-gray-800">Daily supply</td>
                <td className="px-3 py-2 text-right text-gray-500">per day</td>
                <td className="px-3 py-2">
                  <input type="number" step="0.00001" className={inputCls} value={draft.dailySupply.currentPerDay ?? ""} onChange={(e) => patch({ ...draft, dailySupply: { ...draft.dailySupply!, currentPerDay: parseOptional(e.target.value) } })} aria-label="Daily supply current $/day" />
                  <div className="mt-0.5 text-right text-[10px] text-gray-400">$/day</div>
                </td>
                <td className="px-3 py-2 align-top"><AmountCell amount={currentAmount("daily_supply")} /></td>
                <td className="px-3 py-2">
                  <input type="number" step="0.00001" className={inputCls} value={draft.dailySupply.offerPerDay || ""} onChange={(e) => patch({ ...draft, dailySupply: { ...draft.dailySupply!, offerPerDay: parseRate(e.target.value) } })} aria-label="Daily supply offer $/day" placeholder="0" />
                  <div className="mt-0.5 text-right text-[10px] text-gray-400">$/day</div>
                </td>
                <td className="px-3 py-2 align-top"><AmountCell amount={offerAmount("daily_supply")} /></td>
              </tr>
            )}
            {draft.metering && (
              <tr className="border-t border-gray-100">
                <td className="px-3 py-2 font-medium text-gray-800">Metering</td>
                <td className="px-3 py-2 text-right text-gray-500">per day</td>
                <td className="px-3 py-2">
                  <input type="number" step="0.00001" className={inputCls} value={draft.metering.currentPerDay ?? ""} onChange={(e) => patch({ ...draft, metering: { ...draft.metering!, currentPerDay: parseOptional(e.target.value) } })} aria-label="Metering current $/day" />
                  <div className="mt-0.5 text-right text-[10px] text-gray-400">$/day</div>
                </td>
                <td className="px-3 py-2 align-top"><AmountCell amount={currentAmount("metering")} /></td>
                <td className="px-3 py-2">
                  <input type="number" step="0.00001" className={inputCls} value={draft.metering.offerPerDay || ""} onChange={(e) => patch({ ...draft, metering: { ...draft.metering!, offerPerDay: parseRate(e.target.value) } })} aria-label="Metering offer $/day" placeholder="0" />
                  <div className="mt-0.5 text-right text-[10px] text-gray-400">$/day</div>
                </td>
                <td className="px-3 py-2 align-top"><AmountCell amount={offerAmount("metering")} /></td>
              </tr>
            )}
            {draft.demandLines.map((line) => (
              <tr key={line.id} className="border-t border-gray-100">
                <td className="px-3 py-2 font-medium text-gray-800">{line.label}</td>
                <td className="px-3 py-2">
                  <input type="number" step="0.001" className={inputCls} value={line.quantity || ""} onChange={(e) => editDemand(line.id, "quantity", e.target.value)} aria-label={`${line.label} quantity`} />
                  <div className="mt-0.5 text-right text-[10px] text-gray-400">{line.unit}</div>
                </td>
                <td className="px-3 py-2">
                  <input type="number" step="0.00001" className={inputCls} value={line.currentRate ?? ""} onChange={(e) => editDemand(line.id, "currentRate", e.target.value)} aria-label={`${line.label} current rate`} />
                  <div className="mt-0.5 text-right text-[10px] text-gray-400">{line.unit}</div>
                </td>
                <td className="px-3 py-2 align-top"><AmountCell amount={currentAmount(line.id)} /></td>
                <td className="px-3 py-2">
                  <input type="number" step="0.00001" className={inputCls} value={line.offerRate || ""} onChange={(e) => editDemand(line.id, "offerRate", e.target.value)} aria-label={`${line.label} offer rate`} placeholder="0" />
                  <div className="mt-0.5 text-right text-[10px] text-gray-400">{line.unit}</div>
                </td>
                <td className="px-3 py-2 align-top"><AmountCell amount={offerAmount(line.id)} /></td>
              </tr>
            ))}
            {draft.feedIn && (
              <tr className="border-t border-gray-100">
                <td className="px-3 py-2 font-medium text-gray-800">
                  Solar feed-in
                  <label className="mt-1 flex items-center gap-1.5 text-[11px] font-normal text-gray-600">
                    <input
                      type="checkbox"
                      checked={draft.feedIn.offerFitIsZero}
                      onChange={(e) => patch({ ...draft, feedIn: { ...draft.feedIn!, offerFitIsZero: e.target.checked } })}
                    />
                    offer FiT is 0
                  </label>
                </td>
                <td className="px-3 py-2">
                  <input type="number" step="0.001" className={inputCls} value={draft.feedIn.kwh || ""} onChange={(e) => patch({ ...draft, feedIn: { ...draft.feedIn!, kwh: parseOptional(e.target.value) ?? 0 } })} aria-label="Feed-in kWh" />
                  <div className="mt-0.5 text-right text-[10px] text-gray-400">kWh</div>
                </td>
                <td className="px-3 py-2">
                  <input type="number" step="0.001" className={inputCls} value={draft.feedIn.currentCPerKwh ?? ""} onChange={(e) => patch({ ...draft, feedIn: { ...draft.feedIn!, currentCPerKwh: parseOptional(e.target.value) } })} aria-label="Feed-in current c/kWh" />
                  <div className="mt-0.5 text-right text-[10px] text-gray-400">c/kWh</div>
                </td>
                <td className="px-3 py-2 align-top"><AmountCell amount={currentAmount("feed_in")} /></td>
                <td className="px-3 py-2">
                  <input type="number" step="0.001" className={inputCls} value={draft.feedIn.offerCPerKwh || ""} onChange={(e) => patch({ ...draft, feedIn: { ...draft.feedIn!, offerCPerKwh: parseRate(e.target.value), offerFitIsZero: false } })} aria-label="Feed-in offer c/kWh" placeholder="0" />
                  <div className="mt-0.5 text-right text-[10px] text-gray-400">c/kWh</div>
                </td>
                <td className="px-3 py-2 align-top"><AmountCell amount={offerAmount("feed_in")} /></td>
              </tr>
            )}
            <tr className="border-t border-gray-200 bg-gray-50 font-semibold">
              <td className="px-3 py-2 text-gray-800" colSpan={3}>Bill total</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums text-gray-900">{aud(bill.currentTotal)}</td>
              <td />
              <td className="px-3 py-2 text-right font-mono tabular-nums text-gray-900">{aud(bill.offerTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {bill.status === "match" && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900">
          Calculated bill {aud(bill.currentTotal)} matches the invoice total {aud(bill.invoiceTotal)}.
        </p>
      )}
      {bill.status === "mismatch" && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-900">
          Calculated bill {aud(bill.currentTotal)} does not match the invoice total {aud(bill.invoiceTotal)}. Difference {aud(bill.difference)}.
        </p>
      )}
      {bill.status === "incomplete" && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950">
          The bill total is not summed yet. A charge is missing a current rate, so it cannot be checked against the invoice total{bill.invoiceTotal != null ? ` (${aud(bill.invoiceTotal)})` : ""}.
        </p>
      )}
      {bill.status === "no_total" && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950">
          Calculated bill {aud(bill.currentTotal)}. This invoice has no total to check it against.
        </p>
      )}
      <div className="grid grid-cols-1 gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 sm:grid-cols-3">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-gray-500">Current / yr</div>
          <div className="font-mono text-sm font-semibold tabular-nums text-gray-900">{aud(priced.currentAnnual)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-gray-500">Offer / yr</div>
          <div className="font-mono text-sm font-semibold tabular-nums text-gray-900">{aud(priced.offerAnnual)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-gray-500">Annual savings</div>
          <div className={`font-mono text-sm font-semibold tabular-nums ${priced.annualSavings != null && priced.annualSavings > 0 ? "text-emerald-700" : "text-gray-900"}`}>
            {aud(priced.annualSavings)}
          </div>
        </div>
      </div>
      {priced.pricingNotes.length > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950">{priced.pricingNotes.join(" ")}</p>
      )}
      {priced.generateBlockers.length > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950">
          Generate stays blocked. {priced.generateBlockers.join(" ")}
        </p>
      )}
    </div>
  );
}
