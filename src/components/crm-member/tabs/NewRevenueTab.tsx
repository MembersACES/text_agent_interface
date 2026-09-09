"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "../shared/SectionHeader";
import { formatAud } from "@/lib/new-revenue";

interface LineItem {
  solution_label?: string;
  solution_type?: string;
  gross_amount?: number;
  fee_percent?: number;
  fee_amount?: number;
  savings_amount?: number;
}

interface NewRevenueInvoiceSummary {
  invoice_number: string;
  business_name: string;
  due_date: string;
  total_amount: number;
  status: string;
  invoice_file_id?: string;
  line_items?: LineItem[];
}

export interface NewRevenueTabProps {
  businessInfo: Record<string, unknown> | null;
}

function IconPlus() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}

function buildInvoiceParams(businessInfo: Record<string, unknown> | null): URLSearchParams | null {
  const biz = (businessInfo as any)?.business_details ?? {};
  const contact = (businessInfo as any)?.contact_information ?? {};
  const rep = (businessInfo as any)?.representative_details ?? {};
  const driveUrl = (businessInfo as any)?.gdrive?.folder_url as string | undefined;
  const businessName: string = biz?.name ?? "";
  if (!businessName) return null;

  const params = new URLSearchParams();
  params.set("businessName", businessName);
  if (biz.abn) params.set("abn", biz.abn);
  if (biz.trading_name) params.set("tradingAs", biz.trading_name);
  if (contact.email) params.set("email", contact.email);
  if (contact.telephone) params.set("phone", contact.telephone);
  if (contact.postal_address) params.set("address", contact.postal_address);
  if (contact.site_address) params.set("siteAddress", contact.site_address);
  if (rep.contact_name) params.set("contactName", rep.contact_name);
  if (rep.position) params.set("position", rep.position);
  if (driveUrl) params.set("clientFolderUrl", driveUrl);
  return params;
}

export function NewRevenueTab({ businessInfo }: NewRevenueTabProps) {
  const biz = (businessInfo as any)?.business_details ?? {};
  const businessName: string = biz?.name ?? "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<NewRevenueInvoiceSummary[]>([]);

  const latestInvoice = useMemo(
    () => (invoices.length > 0 ? invoices[invoices.length - 1] : null),
    [invoices]
  );

  useEffect(() => {
    if (!businessName) return;
    let cancelled = false;

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/new-revenue/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ business_name: businessName }),
        });
        if (!res.ok) {
          throw new Error("Failed to load discrepancy / new revenue invoices");
        }
        const data = await res.json();
        if (cancelled) return;
        setInvoices(Array.isArray(data.invoices) ? data.invoices : []);
      } catch (err) {
        console.error("Error loading new revenue invoices", err);
        if (!cancelled) {
          setError("Could not load discrepancy / new revenue invoices.");
          setInvoices([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [businessName]);

  const handleOpenInvoice = () => {
    const params = buildInvoiceParams(businessInfo);
    if (!params) return;
    window.open(`/new-revenue?${params.toString()}`, "_blank");
  };

  const updateStatus = async (invoiceNumber: string, newStatus: string) => {
    if (!businessName || !invoiceNumber) return;
    try {
      const res = await fetch("/api/new-revenue/status", {
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

  const lineSummary = (items?: LineItem[]) =>
    items
      ?.map((item) => item.solution_label || item.solution_type || "Service")
      .filter(Boolean)
      .join(", ") ?? "";

  return (
    <Card className="p-0">
      <CardContent className="p-4 space-y-4">
        <SectionHeader
          title="Discrepancy / New Revenue"
          subtitle="Invoice 20% of a recovered discrepancy, rebate, or new revenue stream after the outcome is created."
          actions={
            <button
              type="button"
              onClick={handleOpenInvoice}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <IconPlus />
              Generate invoice
            </button>
          }
        />

        {!businessName ? (
          <p className="text-sm text-gray-400">
            Business name not loaded yet. Check that Business Info has been fetched.
          </p>
        ) : loading ? (
          <p className="text-sm text-gray-400">Loading discrepancy / new revenue invoices...</p>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : invoices.length === 0 ? (
          <EmptyState
            title="No discrepancy / new revenue invoices recorded yet."
            className="py-6 items-start text-left [&_h3]:text-sm [&_h3]:font-normal [&_h3]:text-gray-400 [&_h3]:mb-0"
            action={
              <button
                type="button"
                onClick={handleOpenInvoice}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <IconPlus />
                Create the first invoice
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {latestInvoice && (
              <div className="p-3 border border-cyan-200/70 dark:border-cyan-700/60 rounded-lg bg-cyan-50/60 dark:bg-cyan-900/10 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-cyan-800 dark:text-cyan-200">Latest invoice</p>
                  <p
                    className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate"
                    title={[latestInvoice.invoice_number, latestInvoice.due_date, lineSummary(latestInvoice.line_items)]
                      .filter(Boolean)
                      .join(" · ")}
                  >
                    {latestInvoice.invoice_number}
                    {latestInvoice.due_date && <> · {latestInvoice.due_date}</>}
                    {latestInvoice.line_items && latestInvoice.line_items.length > 0 && (
                      <> · {lineSummary(latestInvoice.line_items)}</>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">
                    {formatAud(Number(latestInvoice.total_amount || 0))}
                  </p>
                  <select
                    value={latestInvoice.status || "Generated"}
                    onChange={(e) => updateStatus(latestInvoice.invoice_number, e.target.value)}
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
                All invoices ({invoices.length})
              </p>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {invoices.map((inv) => (
                  <div
                    key={inv.invoice_number}
                    className="border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                        {inv.invoice_number}
                        {inv.due_date && <> · {inv.due_date}</>}
                        {inv.line_items && inv.line_items.length > 0 && <> · {lineSummary(inv.line_items)}</>}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-0.5">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                        {formatAud(Number(inv.total_amount || 0))}
                      </p>
                      <select
                        value={inv.status || "Generated"}
                        onChange={(e) => updateStatus(inv.invoice_number, e.target.value)}
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
