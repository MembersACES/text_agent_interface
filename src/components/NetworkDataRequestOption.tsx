"use client";

import {
  DATA_REQUEST_INTERNAL_CC,
  GAS_DATA_REQUEST_NETWORKS,
  NETWORK_DATA_HISTORY_YEAR_OPTIONS,
  clampNetworkDataHistoryYears,
  gasNetworkLabelForMirn,
  gasNetworkRequestNote,
  networkDataHistoryLabel,
} from "@/lib/data-request";

export function NetworkDataRequestOption({
  checked,
  identifier,
  selectedNetwork,
  years,
  testSend,
  onChange,
  onNetworkChange,
  onYearsChange,
  onTestSendChange,
}: {
  checked: boolean;
  identifier: string;
  selectedNetwork: string;
  years: number | undefined;
  testSend: boolean;
  onChange: (checked: boolean) => void;
  onNetworkChange: (network: string) => void;
  onYearsChange: (years: number) => void;
  onTestSendChange: (enabled: boolean) => void;
}) {
  const note = gasNetworkRequestNote(selectedNetwork);
  const suggested = gasNetworkLabelForMirn(identifier);
  const selectedYears = clampNetworkDataHistoryYears(years);
  const suggestionHint = !selectedNetwork
    ? "No network matched this MIRN. Choose the one to email."
    : suggested && suggested !== selectedNetwork
      ? `MIRN suggests ${suggested}. This email will go to ${selectedNetwork}.`
      : suggested
        ? "Suggested from the MIRN. Choose another network if this is wrong."
        : `This MIRN did not match a known prefix. This email will go to ${selectedNetwork}.`;
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
            for interval and meter-read data, and to confirm MDQ, MHQ, and the current tariff.
          </span>
        </span>
      </label>
      {checked ? (
        <div className="space-y-2 pl-6">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Network
            </span>
            <select
              value={selectedNetwork}
              onChange={(e) => onNetworkChange(e.target.value)}
              className="w-full rounded-md border-2 border-gray-400 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="">Select a network...</option>
              {GAS_DATA_REQUEST_NETWORKS.map((network) => (
                <option key={network.label} value={network.label}>
                  {network.label}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-gray-600 dark:text-gray-400">{suggestionHint}</p>
          {suggested && suggested !== selectedNetwork ? (
            <button
              type="button"
              onClick={() => onNetworkChange(suggested)}
              className="text-xs text-blue-600 underline dark:text-blue-400"
            >
              Use {suggested}
            </button>
          ) : null}
          {note ? <p className="text-xs text-gray-600 dark:text-gray-400">{note}</p> : null}
        </div>
      ) : null}
      {checked ? (
        <label className="block pl-6">
          <span className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
            History requested
          </span>
          <select
            value={selectedYears}
            onChange={(e) => onYearsChange(Number(e.target.value))}
            className="w-full rounded-md border-2 border-gray-400 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100"
          >
            {NETWORK_DATA_HISTORY_YEAR_OPTIONS.map((year) => (
              <option key={year} value={year}>
                Last {networkDataHistoryLabel(year)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          className="mt-1"
          checked={testSend}
          onChange={(e) => onTestSendChange(e.target.checked)}
        />
        <span>
          <span className="font-semibold">Test</span>
          <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
            Sends this email only to {DATA_REQUEST_INTERNAL_CC}. The network and retailer are not
            emailed.
          </span>
        </span>
      </label>
    </div>
  );
}
