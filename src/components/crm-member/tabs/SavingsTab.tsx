"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface LineItem {
  solution_label?: string;
  solution_type?: string;
  savings_amount?: number;
}

interface SavingsInvoiceSummary {
  invoice_number: string;
  business_name: string;
  due_date: string;
  total_amount: number;
  status: string;
  invoice_file_id?: string;
  line_items?: LineItem[];
}

export interface SavingsTabProps {
  businessInfo: Record<string, unknown> | null;
}

function IconPlus() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function SavingsTab({ businessInfo }: SavingsTabProps) {
  const biz = (businessInfo as any)?.business_details ?? {};
  const contact = (businessInfo as any)?.contact_information ?? {};
  const rep = (businessInfo as any)?.representative_details ?? {};
  const driveUrl = (businessInfo as any)?.gdrive?.folder_url as string | undefined;

  const businessName: string = biz?.name ?? "";
  const tradingName: string = biz?.trading_name ?? "";
  const postalAddress: string | undefined = contact?.postal_address;
  const siteAddress: string | undefined = contact?.site_address;

  const [savingsLoading, setSavingsLoading] = useState(false);
  const [savingsError, setSavingsError] = useState<string | null>(null);
  const [savingsCount, setSavingsCount] = useState<number | null>(null);
  const [invoices, setInvoices] = useState<SavingsInvoiceSummary[]>([]);

  const latestInvoice = useMemo(
    () => (invoices.length > 0 ? invoices[invoices.length - 1] : null),
    [invoices]
  );

  const formattedLatestAmount = useMemo(() => {
    if (!latestInvoice) return "";
    const value = Number(latestInvoice.total_amount || 0);
    if (!Number.isFinite(value)) return "";
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(value);
  }, [latestInvoice]);

  useEffect(() => {
    if (!businessName) return;

    let cancelled = false;

    const fetchSavingsHistory = async () => {
      setSavingsLoading(true);
      setSavingsError(null);
      try {
        const res = await fetch("/api/one-month-savings/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ business_name: businessName }),
        });

        if (!res.ok) {
          throw new Error("Failed to load 1st Month Savings invoices");
        }

        const data = await res.json();
        if (cancelled) return;

        const list = Array.isArray(data.invoices) ? data.invoices : [];
        setInvoices(list);
        setSavingsCount(list.length);
      } catch (error) {
        console.error("Error loading 1st Month Savings invoices", error);
        if (!cancelled) {
          setSavingsError("Could not load 1st Month Savings invoices.");
          setInvoices([]);
          setSavingsCount(null);
        }
      } finally {
        if (!cancelled) {
          setSavingsLoading(false);
        }
      }
    };

    fetchSavingsHistory();

    return () => {
      cancelled = true;
    };
  }, [businessName]);

  const handleOpenOneMonthSavings = () => {
    if (!businessName) return;

    const params = new URLSearchParams();

    if (businessName) params.set("businessName", businessName);
    if (biz.abn) params.set("abn", biz.abn);
    if (tradingName) params.set("tradingAs", tradingName);
    if (contact.email) params.set("email", contact.email);
    if (contact.telephone) params.set("phone", contact.telephone);
    if (postalAddress) params.set("address", postalAddress);
    if (siteAddress) params.set("siteAddress", siteAddress);
    if (rep.contact_name) params.set("contactName", rep.contact_name);
    if (rep.position) params.set("position", rep.position);
    if (driveUrl) params.set("clientFolderUrl", driveUrl);

    window.open(`/one-month-savings?${params.toString()}`, "_blank");
  };

  const updateStatus = async (invoiceNumber: string, newStatus: string) => {
    if (!businessName || !invoiceNumber) return;
    try {
      const res = await fetch("/api/one-month-savings/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: businessName,
          invoice_number: invoiceNumber,
          status: newStatus,
        }),
      });
      if (res.ok) {
        setInvoices((prev) =>
          prev.map((inv) =>
            inv.invoice_number === invoiceNumber ? { ...inv, status: newStatus } : inv
          )
        );
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  return (
    <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              1st Month Savings
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              View and generate 1st Month Savings invoices for this member.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenOneMonthSavings}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <IconPlus />
            Generate invoice
          </button>
        </div>

        {!businessName ? (
          <p className="text-sm text-gray-400">
            Business name not loaded yet. Check that Business Info has been fetched.
          </p>
        ) : savingsLoading ? (
          <p className="text-sm text-gray-400">
            Loading 1st Month Savings invoices...
          </p>
        ) : savingsError ? (
          <p className="text-sm text-red-500">{savingsError}</p>
        ) : invoices.length === 0 ? (
          <div className="text-sm text-gray-400">
            No 1st Month Savings invoices recorded yet.
            <br />
            <button
              type="button"
              onClick={handleOpenOneMonthSavings}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <IconPlus />
              Create the first invoice
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {latestInvoice && (
              <div className="p-3 border border-emerald-200/70 dark:border-emerald-700/60 rounded-lg bg-emerald-50/60 dark:bg-emerald-900/10 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200">
                    Latest invoice
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate" title={
                    [
                      latestInvoice.invoice_number,
                      latestInvoice.due_date ? `Due ${latestInvoice.due_date}` : "Due date not set",
                      latestInvoice.line_items?.length
                        ? latestInvoice.line_items.map((item) => item.solution_label || item.solution_type || "Service").filter(Boolean).join(", ")
                        : "",
                    ].filter(Boolean).join(" · ")
                  }>
                    {latestInvoice.invoice_number}
                    {latestInvoice.due_date && (
                      <> · {latestInvoice.due_date}</>
                    )}
                    {latestInvoice.line_items && latestInvoice.line_items.length > 0 && (
                      <> · {latestInvoice.line_items.map((item) => item.solution_label || item.solution_type || "Service").filter(Boolean).join(", ")}</>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  {formattedLatestAmount && (
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                      {formattedLatestAmount}
                    </p>
                  )}
                  <select
                    value={latestInvoice.status || "Generated"}
                    onChange={(e) =>
                      updateStatus(latestInvoice.invoice_number, e.target.value)
                    }
                    className="text-[11px] border border-gray-300 dark:border-gray-600 rounded px-2 py-0.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 mt-0.5"
                  >
                    <option value="Generated">Generated</option>
                    <option value="Sent">Sent</option>
                    <option value="Paid">Paid</option>
                  </select>
                  {latestInvoice.invoice_file_id && (
                    <a
                      href={`https://drive.google.com/file/d/${latestInvoice.invoice_file_id}/view`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-[11px] font-semibold text-primary hover:underline mt-1"
                    >
                      View invoice
                    </a>
                  )}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">
                All invoices{typeof savingsCount === "number" ? ` (${savingsCount})` : ""}
              </p>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {invoices.map((inv) => (
                  <div
                    key={inv.invoice_number}
                    className="border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate" title={
                        [
                          inv.invoice_number,
                          inv.due_date || "Due date not recorded",
                          inv.line_items?.length
                            ? inv.line_items.map((item) => item.solution_label || item.solution_type || "Service").filter(Boolean).join(", ")
                            : "",
                        ].filter(Boolean).join(" · ")
                      }>
                        {inv.invoice_number}
                        {inv.due_date && <> · {inv.due_date}</>}
                        {inv.line_items && inv.line_items.length > 0 && (
                          <> · {inv.line_items.map((item) => item.solution_label || item.solution_type || "Service").filter(Boolean).join(", ")}</>
                        )}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-0.5">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                        {new Intl.NumberFormat("en-AU", {
                          style: "currency",
                          currency: "AUD",
                        }).format(Number(inv.total_amount || 0))}
                      </p>
                      <select
                        value={inv.status || "Generated"}
                        onChange={(e) =>
                          updateStatus(inv.invoice_number, e.target.value)
                        }
                        className="text-[11px] border border-gray-300 dark:border-gray-600 rounded px-2 py-0.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                      >
                        <option value="Generated">Generated</option>
                        <option value="Sent">Sent</option>
                        <option value="Paid">Paid</option>
                      </select>
                      {inv.invoice_file_id && (
                        <a
                          href={`https://drive.google.com/file/d/${inv.invoice_file_id}/view`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-semibold text-primary hover:underline"
                        >
                          View invoice
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

