"use client";

import { gasNetworkRequestNote } from "@/lib/data-request";

export function NetworkDataRequestOption({
  checked,
  selectedNetwork,
  onChange,
}: {
  checked: boolean;
  selectedNetwork: string;
  onChange: (checked: boolean) => void;
}) {
  const note = gasNetworkRequestNote(selectedNetwork);
  return (
    <div className="space-y-2">
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          className="mt-1"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>
          <span className="font-semibold">Network Data Request</span>
          <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
            Leave this off to email the retailer as usual. Tick it to email the gas network
            for 36 months of interval and meter-read data, and to confirm MDQ, MHQ, and the
            current tariff.
          </span>
        </span>
      </label>
      {checked ? (
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {note ?? "Pick the network. The MIRN is used to suggest one."}
        </p>
      ) : null}
    </div>
  );
}
