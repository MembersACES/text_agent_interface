"use client";

import { useCallback, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

export interface SolutionsTabProps {
  businessInfo: Record<string, unknown> | null;
  setBusinessInfo: (info: Record<string, unknown> | null) => void;
}

type DataTab = "automation" | "discrepancy" | "advocacy" | "ghgreporting";

export function SolutionsTab({
  businessInfo,
}: SolutionsTabProps) {
  const { showToast } = useToast();
  const info = businessInfo as any;
  const business = info?.business_details || {};

  const [activeDataTab, setActiveDataTab] = useState<DataTab>("automation");
  const [automationLoading, setAutomationLoading] = useState(false);
  const [automationData, setAutomationData] = useState<any[] | null>(null);
  const [discrepancyLoading, setDiscrepancyLoading] = useState(false);
  const [discrepancyData, setDiscrepancyData] = useState<any[] | null>(null);
  const [advocacyLoading, setAdvocacyLoading] = useState(false);
  const [advocacyData, setAdvocacyData] = useState<any[] | null>(null);
  const [advocacyMeetingDate, setAdvocacyMeetingDate] = useState<string>("");
  const [advocacyMeetingTime, setAdvocacyMeetingTime] = useState<string>("");
  const [advocacyMeetingCompleted, setAdvocacyMeetingCompleted] =
    useState<boolean>(false);
  const [ghgLoading, setGhgLoading] = useState(false);
  const [ghgData, setGhgData] = useState<any[] | null>(null);

  const wipDocId = useMemo(() => {
    const wipUrl = info?._processed_file_ids?.["business_WIP"];
    if (!wipUrl || typeof wipUrl !== "string") return null;
    const match = wipUrl.match(/\/d\/([^/]+)/);
    return match ? match[1] : null;
  }, [info?._processed_file_ids]);

  const callWipWebhook = useCallback(
    async (sheetName: string) => {
      const payload: Record<string, unknown> = {
        business_name: business.name,
        sheet_name: sheetName,
      };
      if (wipDocId) {
        payload.wip_document_id = wipDocId;
      }

      const res = await fetch(
        "https://membersaces.app.n8n.cloud/webhook/pull_descrepancy_advocacy_WIP",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      if (!res.ok || !data) {
        throw new Error("No data found or error occurred");
      }
      return data as any[];
    },
    [business.name, wipDocId]
  );

  const loadAutomation = useCallback(async () => {
    try {
      setAutomationLoading(true);
      const data = await callWipWebhook("Automation & LLMs");
      setAutomationData(data);
    } catch (err) {
      console.error("Error fetching automation data:", err);
      showToast("Error fetching data", "error");
    } finally {
      setAutomationLoading(false);
    }
  }, [callWipWebhook]);

  const loadDiscrepancy = useCallback(async () => {
    try {
      setDiscrepancyLoading(true);
      const data = await callWipWebhook("Discrepancy Adjustments");
      setDiscrepancyData(data);
    } catch (err) {
      console.error("Error fetching discrepancy data:", err);
      showToast("Error fetching data", "error");
    } finally {
      setDiscrepancyLoading(false);
    }
  }, [callWipWebhook]);

  const loadAdvocacy = useCallback(async () => {
    try {
      setAdvocacyLoading(true);
      const data = await callWipWebhook("Advocacy Members");
      setAdvocacyData(data);

      if (Array.isArray(data) && data.length > 0) {
        const mainBusinessRow = data.find((row: any) => {
          const memberName =
            row.advocacy_member ||
            row.ADVOCACY_MEMBER ||
            row["Advocacy Member"] ||
            "";
          return memberName === business.name;
        });

        if (mainBusinessRow) {
          if (
            mainBusinessRow.advocacy_meeting_date ||
            mainBusinessRow["Advocacy Meeting Date"]
          ) {
            setAdvocacyMeetingDate(
              mainBusinessRow.advocacy_meeting_date ||
                mainBusinessRow["Advocacy Meeting Date"] ||
                ""
            );
          }
          if (
            mainBusinessRow.advocacy_meeting_time ||
            mainBusinessRow["Advocacy Meeting Time"]
          ) {
            setAdvocacyMeetingTime(
              mainBusinessRow.advocacy_meeting_time ||
                mainBusinessRow["Advocacy Meeting Time"] ||
                ""
            );
          }
          if (
            mainBusinessRow.advocacy_meeting_conducted ||
            mainBusinessRow["Advocacy Meeting Conducted"]
          ) {
            const conducted =
              mainBusinessRow.advocacy_meeting_conducted ||
              mainBusinessRow["Advocacy Meeting Conducted"] ||
              "";
            setAdvocacyMeetingCompleted(
              String(conducted).toLowerCase() === "yes"
            );
          }
        }
      }
    } catch (err) {
      console.error("Error fetching advocacy data:", err);
      showToast("Error fetching data", "error");
    } finally {
      setAdvocacyLoading(false);
    }
  }, [callWipWebhook, business.name]);

  const loadGhg = useCallback(async () => {
    try {
      setGhgLoading(true);
      const payload: Record<string, unknown> = {
        business_name: business.name,
        sheet_name: "GHG reporting",
      };
      if (wipDocId) {
        payload.wip_document_id = wipDocId;
      }
      const res = await fetch(
        "https://membersaces.app.n8n.cloud/webhook/pull_descrepancy_advocacy_WIP",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (res.ok && data) {
        setGhgData(data);
      } else {
        showToast("No data found or error occurred", "error");
      }
    } catch (err) {
      console.error("Error fetching GHG data:", err);
      showToast("Error fetching data", "error");
    } finally {
      setGhgLoading(false);
    }
  }, [business.name, wipDocId]);

  if (!businessInfo) {
    return (
      <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <CardContent className="p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No business information loaded. Load the member&apos;s business
            details to see solutions & outcomes.
          </p>
        </CardContent>
      </Card>
    );
  }

  const TabButton = ({
    value,
    label,
  }: {
    value: DataTab;
    label: string;
  }) => (
    <button
      type="button"
      onClick={() => setActiveDataTab(value)}
      className={`px-4 py-2 font-medium text-xs md:text-sm transition-colors border-b-2 ${
        activeDataTab === value
          ? "border-primary text-primary"
          : "border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600"
      }`}
    >
      {label}
    </button>
  );

  return (
    <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            Solutions & outcomes
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Insights and work-in-progress data for automation, discrepancy,
            advocacy, and GHG reporting.
          </p>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-700 -mx-4 px-4 overflow-x-auto">
          <TabButton value="automation" label="Automation & LLMs" />
          <TabButton value="discrepancy" label="Discrepancy Adjustments" />
          <TabButton value="advocacy" label="Advocacy Members" />
          <TabButton value="ghgreporting" label="GHG Reporting" />
        </div>

        {activeDataTab === "automation" && (
          <div className="space-y-3">
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={loadAutomation}
                disabled={automationLoading}
                className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-200 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center gap-1"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {automationLoading ? "Loading..." : "Refresh"}
              </button>
            </div>
            <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900/40">
              {automationData && Array.isArray(automationData) && automationData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {automationData.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
                    >
                      {Object.entries(item)
                        .filter(([key]) => key !== "row_number")
                        .map(([key, value]) => (
                          <div key={key} className="mb-2 last:mb-0">
                            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">
                              {key.replace(/_/g, " ")}
                            </div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {String(value) || "N/A"}
                            </div>
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-gray-400 dark:text-gray-500">
                  {automationLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                      Loading...
                    </div>
                  ) : (
                    'No data available - Click "Refresh" to fetch'
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeDataTab === "discrepancy" && (
          <div className="space-y-3">
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={loadDiscrepancy}
                disabled={discrepancyLoading}
                className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-200 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center gap-1"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {discrepancyLoading ? "Loading..." : "Refresh"}
              </button>
            </div>
            <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900/40">
              {discrepancyData &&
              Array.isArray(discrepancyData) &&
              discrepancyData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {discrepancyData.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
                    >
                      {Object.entries(item)
                        .filter(([key]) => key !== "row_number")
                        .map(([key, value]) => {
                          let displayValue = String(value) || "N/A";
                          if (
                            key.toLowerCase().includes("amount") ||
                            key.toLowerCase().includes("discrepancy_amount")
                          ) {
                            const numValue = parseFloat(String(value));
                            if (!isNaN(numValue)) {
                              displayValue = new Intl.NumberFormat("en-AU", {
                                style: "currency",
                                currency: "AUD",
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }).format(numValue);
                            }
                          }

                          return (
                            <div key={key} className="mb-2 last:mb-0">
                              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">
                                {key.replace(/_/g, " ")}
                              </div>
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {displayValue}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-gray-400 dark:text-gray-500">
                  {discrepancyLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                      Loading...
                    </div>
                  ) : (
                    'No data available - Click "Refresh" to fetch'
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeDataTab === "advocacy" && (
          <div className="space-y-3">
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={loadAdvocacy}
                disabled={advocacyLoading}
                className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-200 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center gap-1"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {advocacyLoading ? "Loading..." : "Refresh"}
              </button>
            </div>

            {advocacyData &&
              Array.isArray(advocacyData) &&
              advocacyData.length > 0 && (
                <div className="mb-4 p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100">
                      Advocacy meeting details
                    </h3>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const payload: Record<string, unknown> = {
                            business_name: business.name,
                            advocacy_meeting_date: advocacyMeetingDate,
                            advocacy_meeting_time: advocacyMeetingTime,
                            advocacy_meeting_conducted: advocacyMeetingCompleted
                              ? "Yes"
                              : "No",
                          };
                          if (wipDocId) {
                            payload.wip_document_id = wipDocId;
                          }
                          const res = await fetch(
                            "https://membersaces.app.n8n.cloud/webhook/save_advocacy_WIP",
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify(payload),
                            }
                          );
                          if (res.ok) {
                            showToast("Advocacy meeting details saved successfully!", "success");
                          } else {
                            showToast("Error saving meeting details", "error");
                          }
                        } catch (err) {
                          console.error(
                            "Error saving advocacy meeting:",
                            err
                          );
                          showToast("Error saving meeting details", "error");
                        }
                      }}
                      className="px-3 py-1.5 bg-primary text-white rounded-md hover:opacity-90 font-medium text-xs md:text-sm"
                    >
                      Save meeting details
                    </button>
                  </div>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 mb-3">
                    To qualify for advocacy referral benefits, an advocacy
                    meeting must be organised and completed.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 items-end">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Meeting date
                      </label>
                      <input
                        type="date"
                        value={advocacyMeetingDate}
                        onChange={(e) => setAdvocacyMeetingDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Meeting time
                      </label>
                      <input
                        type="time"
                        value={advocacyMeetingTime}
                        onChange={(e) => setAdvocacyMeetingTime(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2 pb-1">
                      <input
                        id="advocacy-completed"
                        type="checkbox"
                        checked={advocacyMeetingCompleted}
                        onChange={(e) =>
                          setAdvocacyMeetingCompleted(e.target.checked)
                        }
                        className="w-4 h-4 text-primary border-gray-300 dark:border-gray-600 rounded"
                      />
                      <label
                        htmlFor="advocacy-completed"
                        className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Meeting completed
                      </label>
                    </div>
                  </div>
                </div>
              )}

            <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900/40">
              {advocacyData &&
              Array.isArray(advocacyData) &&
              advocacyData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {advocacyData
                    .filter((item: any) => {
                      const memberName =
                        item.advocacy_member ||
                        item.ADVOCACY_MEMBER ||
                        item["Advocacy Member"] ||
                        "";
                      return memberName !== business.name;
                    })
                    .map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
                      >
                        {Object.entries(item)
                          .filter(([key]) => {
                            const keyLower = key.toLowerCase();
                            const excludedPatterns = [
                              "row_number",
                              "meeting_date",
                              "meeting_time",
                              "meeting_conducted",
                              "advocacy meeting date",
                              "advocacy meeting time",
                              "advocacy meeting conducted",
                            ];
                            return !excludedPatterns.some((pattern) =>
                              keyLower.includes(pattern)
                            );
                          })
                          .map(([key, value]) => (
                            <div key={key} className="mb-2 last:mb-0">
                              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">
                                {key.replace(/_/g, " ")}
                              </div>
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {String(value) || "N/A"}
                              </div>
                            </div>
                          ))}
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-gray-400 dark:text-gray-500">
                  {advocacyLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                      Loading...
                    </div>
                  ) : (
                    'No data available - Click "Refresh" to fetch'
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeDataTab === "ghgreporting" && (
          <div className="space-y-3">
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={loadGhg}
                disabled={ghgLoading}
                className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-200 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center gap-1"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {ghgLoading ? "Loading..." : "Refresh"}
              </button>
            </div>
            <div className="border rounded-lg bg-white dark:bg-gray-900 overflow-hidden">
              {ghgData && Array.isArray(ghgData) && ghgData.length > 0 ? (
                <>
                  {ghgData.length <= 4 ? (
                    <div className="p-4">
                      <div
                        className={`grid gap-3 ${
                          ghgData.length === 1
                            ? "grid-cols-1 max-w-2xl"
                            : ghgData.length === 2
                            ? "grid-cols-1 md:grid-cols-2"
                            : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                        }`}
                      >
                        {ghgData.map((item: any, idx: number) => {
                          const entries = Object.entries(item).filter(
                            ([key]) => key !== "row_number"
                          );
                          const reportName =
                            entries[0]?.[1] || "Unnamed Report";
                          return (
                            <div
                              key={idx}
                              className="border border-gray-200 dark:border-gray-700 rounded-md p-3"
                            >
                              <div className="font-semibold text-gray-800 dark:text-gray-100 mb-2">
                                {String(reportName)}
                              </div>
                              <dl className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                                {entries.slice(1).map(([key, value]) => (
                                  <div key={key} className="flex justify-between gap-3">
                                    <dt className="font-medium">
                                      {key.replace(/_/g, " ")}
                                    </dt>
                                    <dd className="text-right">
                                      {String(value) || "—"}
                                    </dd>
                                  </div>
                                ))}
                              </dl>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-xs">
                        <thead className="bg-gray-50 dark:bg-gray-900/60">
                          <tr>
                            {Object.keys(
                              Object.entries(ghgData[0]).reduce(
                                (acc, [key, value]) => {
                                  if (key === "row_number") return acc;
                                  acc[key] = value;
                                  return acc;
                                },
                                {} as Record<string, unknown>
                              )
                            ).map((key) => (
                              <th
                                key={key}
                                className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200"
                              >
                                {key.replace(/_/g, " ")}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                          {ghgData.map((item: any, idx: number) => {
                            const entries = Object.entries(item).filter(
                              ([key]) => key !== "row_number"
                            );
                            return (
                              <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                {entries.map(([key, value]) => (
                                  <td key={key} className="px-3 py-1.5">
                                    {String(value) || "—"}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-sm text-gray-400 dark:text-gray-500">
                  {ghgLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                      <span>Loading GHG reports...</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <svg
                        className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <p>No GHG reports available</p>
                      <p className="text-xs">
                        Click &quot;Refresh&quot; to fetch reports
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

