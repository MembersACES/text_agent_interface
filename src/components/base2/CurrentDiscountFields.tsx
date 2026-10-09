"use client";

import type { CurrentDiscountTarget, CurrentPlanDiscount } from "@/lib/current-plan-discount";

const inputCls =
  "mt-1 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400";

export function CurrentDiscountFields({
  value,
  onChange,
  hint,
}: {
  value?: CurrentPlanDiscount;
  onChange: (next: CurrentPlanDiscount | undefined) => void;
  hint: string;
}) {
  const target = value?.target ?? "both";
  const write = (percent: number | undefined, nextTarget: CurrentDiscountTarget) => {
    if ((percent == null || percent <= 0) && nextTarget === "both") {
      onChange(undefined);
      return;
    }
    onChange({ percent, target: nextTarget });
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-[11px] text-gray-600">
          Current discount %
          <input
            type="number"
            min={0}
            max={100}
            step="0.01"
            className={inputCls}
            value={value?.percent ?? ""}
            onChange={(event) => {
              const raw = event.target.value.trim();
              if (raw === "") {
                write(undefined, target);
                return;
              }
              const parsed = parseFloat(raw);
              write(Number.isFinite(parsed) ? parsed : undefined, target);
            }}
            aria-label="Current discount percent"
            placeholder="0"
          />
        </label>
        <label className="text-[11px] text-gray-600">
          Applies to
          <select
            className={inputCls}
            value={target}
            onChange={(event) => write(value?.percent, event.target.value as CurrentDiscountTarget)}
            aria-label="What the current discount applies to"
          >
            <option value="both">Usage and supply</option>
            <option value="usage">Usage only</option>
            <option value="supply">Supply only</option>
          </select>
        </label>
      </div>
      <p className="mt-2 text-[11px] leading-snug text-gray-500">{hint}</p>
    </div>
  );
}
