"use client";

import React from "react";
import type { AlintaBlock, AlintaPriceSlice, AlintaTariffOverride } from "@/lib/alinta-sme-gas";

export interface SmeGasBillBlock {
  block: number;
  mj: number;
  rateCPerMj?: number;
  amountAud?: number;
  threshold?: string;
}

export interface SmeGasBackendFlag {
  level: string;
  code: string;
  detail: string;
}

/** Current energy $/GJ from bill blocks: printed amounts ÷ MJ. */
export function smeGasRateFromBlocks(blocks: SmeGasBillBlock[]): number | undefined {
  const mj = blocks.reduce((sum, b) => sum + (b.mj || 0), 0);
  const amount = blocks.reduce((sum, b) => sum + (b.amountAud ?? ((b.mj || 0) * (b.rateCPerMj ?? 0)) / 100), 0);
  return mj > 0 ? (amount / mj) * 1000 : undefined;
}

const aud = (n: number | undefined) =>
  n == null || !Number.isFinite(n) ? "—" : n.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
const mj = (n: number) => n.toLocaleString("en-AU", { maximumFractionDigits: 0 });
const cents = (n: number | undefined) => (n == null || !Number.isFinite(n) ? "—" : `${n.toFixed(4)}c`);

const th = "px-2 py-1.5 text-left font-semibold text-gray-600";
const thR = "px-2 py-1.5 text-right font-semibold text-gray-600";
const td = "px-2 py-1.5 text-gray-800";
const tdR = "px-2 py-1.5 text-right font-mono tabular-nums text-gray-800";
const cellInput =
  "w-full rounded border border-gray-300 bg-white px-1.5 py-0.5 text-right font-mono text-[11px] tabular-nums focus:outline-none focus:ring-1 focus:ring-teal-400";

function OfferTariffEditor({
  tariff,
  edited,
  onChange,
  onReset,
  resetLabel = "Reset to Group 1",
  hint = "Type the portal quote. First row is the first MJ/day, then the next band. The last row is the remainder. Group 1 is only the starting point.",
}: {
  tariff: AlintaTariffOverride;
  edited?: boolean;
  onChange: (tariff: AlintaTariffOverride) => void;
  onReset?: () => void;
  resetLabel?: string;
  hint?: string;
}) {
  const write = (blocks: AlintaBlock[], supplyCPerDay = tariff.supplyCPerDay) => {
    onChange({ blocks, supplyCPerDay });
  };

  const editWidth = (index: number, raw: string) => {
    const mjPerDay = raw === "" ? null : parseFloat(raw);
    write(tariff.blocks.map((block, i) => (i === index ? { ...block, mjPerDay: mjPerDay != null && Number.isFinite(mjPerDay) ? mjPerDay : null } : block)));
  };

  const editRate = (index: number, raw: string) => {
    const rate = raw === "" ? NaN : parseFloat(raw);
    write(tariff.blocks.map((block, i) => (i === index ? { ...block, rateCPerMj: Number.isFinite(rate) ? rate : block.rateCPerMj } : block)));
  };

  const addBand = () => {
    const remainder = tariff.blocks[tariff.blocks.length - 1] ?? { mjPerDay: null, rateCPerMj: 0 };
    const heads = tariff.blocks.slice(0, -1);
    write([...heads, { mjPerDay: 10, rateCPerMj: remainder.rateCPerMj }, { ...remainder, mjPerDay: null }]);
  };

  const removeBand = (index: number) => {
    if (tariff.blocks.length <= 1) return;
    const next = tariff.blocks.filter((_, i) => i !== index);
    next[next.length - 1] = { ...next[next.length - 1], mjPerDay: null };
    write(next);
  };

  return (
    <div className="border-b border-teal-100 bg-teal-50/40 px-3 py-2">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[11px] font-normal text-gray-600">{hint}</p>
        {edited && onReset && (
          <button type="button" onClick={onReset} className="shrink-0 text-[11px] font-semibold text-teal-800 underline">
            {resetLabel}
          </button>
        )}
      </div>
      <table className="w-full text-[11px]">
        <thead>
          <tr>
            <th className={th}>Step</th>
            <th className={thR}>MJ/day</th>
            <th className={thR}>c/MJ</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {tariff.blocks.map((block, index) => {
            const last = index === tariff.blocks.length - 1;
            return (
              <tr key={index} className="border-t border-teal-100">
                <td className={td}>{last ? "Remaining" : index === 0 ? "First" : "Next"}</td>
                <td className={tdR}>
                  {last ? (
                    <span className="text-gray-400">rest</span>
                  ) : (
                    <input type="number" step="0.001" min={0} className={cellInput} value={block.mjPerDay ?? ""} onChange={(e) => editWidth(index, e.target.value)} />
                  )}
                </td>
                <td className={tdR}>
                  <input type="number" step="0.0001" min={0} className={cellInput} value={Number.isFinite(block.rateCPerMj) ? block.rateCPerMj : ""} onChange={(e) => editRate(index, e.target.value)} />
                </td>
                <td className="px-1 text-right">
                  {!last && tariff.blocks.length > 1 && (
                    <button type="button" onClick={() => removeBand(index)} className="text-[11px] text-red-600" aria-label="Remove band">
                      ×
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
          <tr className="border-t border-teal-100">
            <td className={td}>Daily charge</td>
            <td className={tdR} colSpan={2}>
              <label className="flex items-center justify-end gap-1 text-gray-500">
                <input
                  type="number"
                  step="0.001"
                  min={0}
                  className={`${cellInput} w-24`}
                  value={Number.isFinite(tariff.supplyCPerDay) ? tariff.supplyCPerDay : ""}
                  onChange={(e) => {
                    const cents = e.target.value === "" ? 0 : parseFloat(e.target.value);
                    if (Number.isFinite(cents)) write(tariff.blocks, cents);
                  }}
                />
                c/day
              </label>
            </td>
            <td />
          </tr>
        </tbody>
      </table>
      <button type="button" onClick={addBand} className="mt-1.5 text-[11px] font-semibold text-teal-800 underline">
        Add band
      </button>
    </div>
  );
}

/**
 * SME → SME gas, step by step: the bill's own blocks (editable) next to the Alinta network
 * card's MJ/day bands, then the annual energy line. Every $/GJ on the card can be traced here.
 */
export function SmeGasStepsTable({
  retailer,
  billBlocks,
  billDays,
  billPeriodLabel,
  priceChange,
  edited,
  onBlocksChange,
  onResetBlocks,
  networkLabel,
  offerTariff,
  offerTariffEdited,
  onOfferTariffChange,
  onOfferTariffReset,
  offerEditorHint,
  offerResetLabel,
  slices,
  offerUsageGj,
  onOfferUsageChange,
  currentRatePerGj,
  offerRatePerGj,
  annualGj,
  annualEnergySaving,
  currentSupplyPerDay,
  offerSupplyPerDay,
  onCurrentSupplyChange,
  onOfferSupplyChange,
  annualSupplySaving,
  commissionPerGj,
  annualCommission,
}: {
  retailer?: string;
  billBlocks: SmeGasBillBlock[];
  billDays?: number;
  billPeriodLabel?: string;
  priceChange?: boolean;
  edited?: boolean;
  onBlocksChange?: (blocks: SmeGasBillBlock[]) => void;
  onResetBlocks?: () => void;
  networkLabel?: string;
  /** Bands currently priced. Group 1 until the portal quote is typed in. */
  offerTariff?: AlintaTariffOverride;
  offerTariffEdited?: boolean;
  onOfferTariffChange?: (tariff: AlintaTariffOverride) => void;
  onOfferTariffReset?: () => void;
  offerEditorHint?: string;
  offerResetLabel?: string;
  slices: AlintaPriceSlice[];
  offerUsageGj?: number;
  onOfferUsageChange?: (value: string) => void;
  currentRatePerGj?: number;
  offerRatePerGj?: number;
  annualGj?: number;
  annualEnergySaving?: number;
  currentSupplyPerDay?: number;
  offerSupplyPerDay?: number;
  onCurrentSupplyChange?: (value: string) => void;
  onOfferSupplyChange?: (value: string) => void;
  annualSupplySaving?: number;
  commissionPerGj?: number;
  annualCommission?: number;
}) {
  const billMj = billBlocks.reduce((sum, b) => sum + (b.mj || 0), 0);
  const billAud = billBlocks.reduce((sum, b) => sum + (b.amountAud ?? 0), 0);

  const edit = (index: number, field: "mj" | "rateCPerMj" | "amountAud", raw: string) => {
    if (!onBlocksChange) return;
    const value = raw === "" ? undefined : parseFloat(raw);
    const next = billBlocks.map((b, i) => {
      if (i !== index) return b;
      const row: SmeGasBillBlock = { ...b, [field]: field === "mj" ? value ?? 0 : value };
      if (field !== "amountAud" && row.rateCPerMj != null && Number.isFinite(row.rateCPerMj)) {
        row.amountAud = Math.round(row.mj * row.rateCPerMj) / 100;
      }
      return row;
    });
    onBlocksChange(next);
  };

  const mismatches = billBlocks.filter(
    (b) => b.rateCPerMj != null && b.amountAud != null && Math.abs((b.mj * b.rateCPerMj) / 100 - b.amountAud) > 0.05,
  );

  return (
    <div className="mt-3 space-y-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="flex items-start justify-between border-b border-gray-200 px-3 py-2 text-xs font-semibold text-gray-900">
            <div>
              Current bill{retailer ? `: ${retailer}` : ""}
              <div className="text-[11px] font-normal text-gray-500">
                {billPeriodLabel ? `${billPeriodLabel}, ` : ""}
                {billDays ? `${billDays} days` : ""}
                {priceChange ? " (latest price period only; the rates changed during this bill)" : ""}
              </div>
            </div>
            {edited && onResetBlocks && (
              <button type="button" onClick={onResetBlocks} className="text-[11px] font-normal text-teal-700 underline">
                Reset to invoice
              </button>
            )}
          </div>
          {billBlocks.length === 0 ? (
            <p className="px-3 py-2 text-[11px] text-amber-700">No usage blocks on this invoice.</p>
          ) : (
            <table className="w-full text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className={th}>Step</th>
                  <th className={thR}>MJ</th>
                  <th className={thR}>c/MJ</th>
                  <th className={thR}>Amount $</th>
                </tr>
              </thead>
              <tbody>
                {billBlocks.map((b, i) => (
                  <tr key={b.block} className="border-t border-gray-100">
                    <td className={td}>{b.threshold || `Block ${b.block}`}</td>
                    <td className={tdR}>
                      <input type="number" step="1" className={cellInput} value={Number.isFinite(b.mj) ? b.mj : ""} onChange={(e) => edit(i, "mj", e.target.value)} />
                    </td>
                    <td className={tdR}>
                      <input type="number" step="0.0001" className={cellInput} value={b.rateCPerMj ?? ""} onChange={(e) => edit(i, "rateCPerMj", e.target.value)} />
                    </td>
                    <td className={tdR}>
                      <input type="number" step="0.01" className={cellInput} value={b.amountAud ?? ""} onChange={(e) => edit(i, "amountAud", e.target.value)} />
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-gray-200 bg-gray-50 font-semibold">
                  <td className={td}>Energy</td>
                  <td className={tdR}>{mj(billMj)}</td>
                  <td className={tdR}>{billMj > 0 ? `$${((billAud / billMj) * 1000).toFixed(4)}/GJ` : "—"}</td>
                  <td className={tdR}>{aud(billAud)}</td>
                </tr>
              </tbody>
            </table>
          )}
          {mismatches.map((b) => (
            <p key={b.block} className="border-t border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-800">
              Step {b.block}: {mj(b.mj)} MJ × {b.rateCPerMj} c/MJ = {aud((b.mj * (b.rateCPerMj ?? 0)) / 100)}, but the amount is {aud(b.amountAud)}. Check the invoice. The amount is what is used.
            </p>
          ))}
        </div>

        <div className="rounded-lg border border-teal-200 bg-white">
          <div className="flex items-start justify-between gap-3 border-b border-teal-200 px-3 py-2 text-xs font-semibold text-gray-900">
            <div>
              Alinta offer{networkLabel ? `: ${networkLabel}` : ""}
              <div className="text-[11px] font-normal text-gray-500">Each step is an MJ/day band, priced for the days in that season.</div>
            </div>
            {onOfferUsageChange && (
              <label className="shrink-0 text-right text-[11px] font-normal text-gray-500">
                Bill usage (GJ)
                <input
                  type="number"
                  step="0.001"
                  className={`${cellInput} mt-0.5 w-24`}
                  value={offerUsageGj ?? ""}
                  onChange={(e) => onOfferUsageChange(e.target.value)}
                />
              </label>
            )}
          </div>
          {offerTariff && onOfferTariffChange && (
            <OfferTariffEditor
              tariff={offerTariff}
              edited={offerTariffEdited}
              onChange={onOfferTariffChange}
              onReset={onOfferTariffReset}
              hint={offerEditorHint}
              resetLabel={offerResetLabel}
            />
          )}
          {slices.length === 0 ? (
            <p className="px-3 py-2 text-[11px] text-amber-700">No offer priced. See the note above.</p>
          ) : (
            slices.map((slice) => {
              const perDay = slice.days > 0 ? slice.mj / slice.days : 0;
              return (
                <table key={slice.seasonId} className="w-full text-[11px]">
                  <thead className="bg-teal-50/60">
                    <tr>
                      <th className={th} colSpan={5}>
                        {slice.seasonLabel}: {slice.days} days at {mj(perDay)} MJ/day
                      </th>
                    </tr>
                    <tr>
                      <th className={th}>Band (MJ/day)</th>
                      <th className={thR}>MJ/day</th>
                      <th className={thR}>MJ</th>
                      <th className={thR}>c/MJ</th>
                      <th className={thR}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slice.steps.map((step, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className={td}>
                          {step.toMjPerDay == null ? `Over ${mj(step.fromMjPerDay)}` : `${mj(step.fromMjPerDay)}–${mj(step.toMjPerDay)}`}
                        </td>
                        <td className={tdR}>{step.mjPerDay.toLocaleString("en-AU", { maximumFractionDigits: 1 })}</td>
                        <td className={tdR}>{mj(step.mj)}</td>
                        <td className={tdR}>{cents(step.rateCPerMj)}</td>
                        <td className={tdR}>{aud(step.aud)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-gray-200 bg-teal-50/60 font-semibold">
                      <td className={td}>Energy</td>
                      <td className={tdR}></td>
                      <td className={tdR}>{mj(slice.mj)}</td>
                      <td className={tdR}>{slice.mj > 0 ? `$${((slice.energyAud / slice.mj) * 1000).toFixed(4)}/GJ` : "—"}</td>
                      <td className={tdR}>{aud(slice.energyAud)}</td>
                    </tr>
                    <tr className="text-gray-500">
                      <td className={td} colSpan={4}>Supply, {slice.days} days</td>
                      <td className={tdR}>{aud(slice.supplyAud)}</td>
                    </tr>
                  </tbody>
                </table>
              );
            })
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800">
        <span className="font-semibold">Daily supply</span>
        <span className="flex items-center gap-2 font-mono tabular-nums">
          <label className="flex items-center gap-1 font-sans text-[11px] text-gray-500">
            Current $/day
            <input type="number" step="0.00001" className={`${cellInput} w-24`} value={currentSupplyPerDay ?? ""} onChange={(e) => onCurrentSupplyChange?.(e.target.value)} readOnly={!onCurrentSupplyChange} />
          </label>
          <span className="text-gray-400">vs</span>
          <label className="flex items-center gap-1 font-sans text-[11px] text-gray-500">
            Offer $/day
            <input type="number" step="0.00001" className={`${cellInput} w-24`} value={offerSupplyPerDay ?? ""} onChange={(e) => onOfferSupplyChange?.(e.target.value)} readOnly={!onOfferSupplyChange} />
          </label>
          <span>× 365</span>
        </span>
        <span className="font-mono font-semibold tabular-nums text-teal-800">
          {annualSupplySaving != null && annualSupplySaving < 0 ? "Increase " : "Saving "}
          {aud(annualSupplySaving != null ? Math.abs(annualSupplySaving) : undefined)}/yr
        </span>
      </div>

      {currentRatePerGj != null && offerRatePerGj != null && annualGj != null && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-teal-200 bg-teal-50/50 px-3 py-2 text-xs text-gray-800">
          <span className="font-semibold">Annual energy</span>
          <span className="font-mono tabular-nums">
            (${currentRatePerGj.toFixed(4)} − ${offerRatePerGj.toFixed(4)}) × {annualGj.toLocaleString("en-AU", { maximumFractionDigits: 2 })} GJ/yr
          </span>
          <span className="font-mono font-semibold tabular-nums text-teal-800">
            {annualEnergySaving != null && annualEnergySaving < 0 ? "Increase " : "Saving "}
            {aud(annualEnergySaving != null ? Math.abs(annualEnergySaving) : undefined)}/yr
          </span>
        </div>
      )}

      {commissionPerGj != null && annualGj != null && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-violet-200 bg-violet-50/50 px-3 py-2 text-xs text-gray-800">
          <span className="font-semibold">Annual comms estimate</span>
          <span className="font-mono tabular-nums">
            ${commissionPerGj.toFixed(2)}/GJ × {annualGj.toLocaleString("en-AU", { maximumFractionDigits: 2 })} GJ/yr
          </span>
          <span className="font-mono font-semibold tabular-nums text-violet-800">{aud(annualCommission)}/yr</span>
        </div>
      )}
    </div>
  );
}
