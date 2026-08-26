"use client";

import { FileText } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TESTIMONIAL_STATUSES } from "@/constants/crm";
import { SOLUTION_TYPE_LABELS } from "@/lib/testimonial-solution-content";
import { cn, formatDateAustralian } from "@/lib/utils";

const INPUT_CLASS =
  "w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary/20 focus:border-primary";

export type ExampleItem = {
  id: number;
  business_name: string;
  file_name: string;
  file_id: string;
  file_link?: string | null;
  testimonial_savings?: string | null;
  testimonial_type?: string | null;
  testimonial_solution_type_id?: string | null;
  invoice_number?: string | null;
  status?: string | null;
  source?: string | null;
  created_at?: string | null;
};

export type InvoiceFilter = "all" | "with" | "without" | "none";
export type InvoiceState = "linked" | "missing" | "none";
export type TypeOption = { id: string; label: string };

/** Stored in invoice_number when this testimonial has no invoice by design. */
export const NO_INVOICE_RECORDED = "No invoice recorded";

/** Types that do not get a 1st Month Savings invoice. */
export const NO_INVOICE_TYPE_IDS = new Set([
  "client_endorsement",
  "ghg_roadmap",
  "solar_panel_cleaning",
  "solar_review",
]);

function isNoInvoiceSentinel(value: string | null | undefined): boolean {
  const raw = (value || "").trim();
  if (!raw) return false;
  return raw.toLowerCase() === NO_INVOICE_RECORDED.toLowerCase() || raw.toLowerCase() === "n/a";
}

export function isMarkedNoInvoice(row: ExampleItem): boolean {
  return isNoInvoiceSentinel(row.invoice_number);
}

export function hasLinkedInvoice(row: ExampleItem): boolean {
  const raw = row.invoice_number?.trim();
  return Boolean(raw) && !isNoInvoiceSentinel(raw);
}

export function typeExpectsNoInvoice(row: ExampleItem): boolean {
  const id = (row.testimonial_solution_type_id || "").trim();
  if (id && NO_INVOICE_TYPE_IDS.has(id)) return true;
  const label = (row.testimonial_type || "").trim().toLowerCase();
  if (!label) return false;
  for (const typeId of NO_INVOICE_TYPE_IDS) {
    const known = SOLUTION_TYPE_LABELS[typeId];
    if (known && known.toLowerCase() === label) return true;
  }
  return false;
}

export function invoiceState(row: ExampleItem): InvoiceState {
  if (hasLinkedInvoice(row)) return "linked";
  if (isNoInvoiceSentinel(row.invoice_number) || typeExpectsNoInvoice(row)) return "none";
  return "missing";
}

export function matchesInvoiceFilter(row: ExampleItem, filter: InvoiceFilter): boolean {
  if (filter === "all") return true;
  const state = invoiceState(row);
  if (filter === "with") return state === "linked";
  if (filter === "without") return state === "missing";
  return state === "none";
}

export function driveFileUrl(ex: ExampleItem): string {
  if (ex.file_link) return ex.file_link;
  return `https://drive.google.com/file/d/${ex.file_id}/view`;
}

export function isSheetSourced(row: ExampleItem): boolean {
  return row.source === "sheet" || row.id < 0;
}

export function typeLabel(row: ExampleItem): string {
  if (row.testimonial_type?.trim()) return row.testimonial_type.trim();
  const id = row.testimonial_solution_type_id ?? "";
  return SOLUTION_TYPE_LABELS[id] || id || "—";
}

export const UNCATEGORISED_FILTER = "__uncategorised__";

export function rowSolutionTypeId(row: ExampleItem, solutionTypes: TypeOption[]): string | null {
  const ids = new Set(solutionTypes.map((opt) => opt.id));
  const labels = new Map(solutionTypes.map((opt) => [opt.label.trim().toLowerCase(), opt.id]));
  const sid = (row.testimonial_solution_type_id || "").trim();
  if (sid && ids.has(sid)) return sid;
  const label = (row.testimonial_type || "").trim().toLowerCase();
  if (label && labels.has(label)) return labels.get(label) ?? null;
  return null;
}

export function driveInvoiceUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

export function extractDriveFileId(value: string | null | undefined): string | null {
  const raw = (value || "").trim();
  if (!raw) return null;
  const fromPath = raw.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
  if (fromPath) return fromPath[1];
  const fromQuery = raw.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (fromQuery) return fromQuery[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(raw)) return raw;
  return null;
}

function FilterChip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold",
        pressed
          ? "border-transparent bg-primary/10 text-primary"
          : "border-gray-200 text-gray-600 dark:border-gray-700"
      )}
    >
      {children}
    </button>
  );
}

export function TestimonialRecordsPanel({
  rows,
  countSource,
  loading,
  error,
  onRetry,
  emptyTitle,
  emptyDescription,
  showType,
  showAdded,
  search,
  onSearch,
  statusFilter,
  onStatusFilter,
  invoiceFilter,
  onInvoiceFilter,
  typeFilter,
  typeOptions,
  onTypeFilter,
  solutionTypes,
  onTypeChange,
  onStatusChange,
  onDelete,
  onLinkInvoice,
  onUnlinkInvoice,
  onOpenInvoice,
  onMarkNoInvoice,
  headerAction,
  footerNote,
}: {
  rows: ExampleItem[];
  countSource: ExampleItem[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  emptyTitle: string;
  emptyDescription: string;
  showType: boolean;
  showAdded: boolean;
  search: string;
  onSearch: (value: string) => void;
  statusFilter: "all" | (typeof TESTIMONIAL_STATUSES)[number];
  onStatusFilter: (value: "all" | (typeof TESTIMONIAL_STATUSES)[number]) => void;
  invoiceFilter: InvoiceFilter;
  onInvoiceFilter: (value: InvoiceFilter) => void;
  typeFilter?: string;
  typeOptions?: TypeOption[];
  onTypeFilter?: (value: string) => void;
  solutionTypes?: TypeOption[];
  onTypeChange?: (id: number, typeId: string) => void;
  onStatusChange: (id: number, status: string) => void;
  onDelete: (row: ExampleItem) => void;
  onLinkInvoice: (row: ExampleItem) => void;
  onUnlinkInvoice: (row: ExampleItem) => void;
  onOpenInvoice?: (row: ExampleItem) => void;
  onMarkNoInvoice?: (row: ExampleItem) => void;
  headerAction?: ReactNode;
  footerNote: string;
}) {
  const afterInvoice =
    invoiceFilter === "all" ? countSource : countSource.filter((row) => matchesInvoiceFilter(row, invoiceFilter));
  const afterStatus =
    statusFilter === "all" ? countSource : countSource.filter((row) => row.status === statusFilter);
  const withCount = afterStatus.filter((row) => invoiceState(row) === "linked").length;
  const withoutCount = afterStatus.filter((row) => invoiceState(row) === "missing").length;
  const noneCount = afterStatus.filter((row) => invoiceState(row) === "none").length;

  const filteredEmpty = !loading && !error && countSource.length > 0 && rows.length === 0;

  return (
    <div>
      <div className="mb-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={showType ? "Search business, type or invoice…" : "Search business or file…"}
            className={cn(INPUT_CLASS, "max-w-xs")}
          />
          {showType && typeOptions && onTypeFilter ? (
            <select
              value={typeFilter ?? "all"}
              onChange={(e) => onTypeFilter(e.target.value)}
              className={cn(INPUT_CLASS, "max-w-[18rem]")}
              aria-label="Filter by type"
            >
              <option value="all">All types</option>
              {typeOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : null}
          {headerAction ? <div className="ml-auto shrink-0">{headerAction}</div> : null}
        </div>
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:thin]">
          <FilterChip pressed={statusFilter === "all"} onClick={() => onStatusFilter("all")}>
            All {afterInvoice.length}
          </FilterChip>
          {TESTIMONIAL_STATUSES.map((status) => {
            const n = afterInvoice.filter((row) => row.status === status).length;
            return (
              <FilterChip key={status} pressed={statusFilter === status} onClick={() => onStatusFilter(status)}>
                {status} {n}
              </FilterChip>
            );
          })}
          <span className="mx-1 h-4 w-px shrink-0 bg-gray-200 dark:bg-gray-700" aria-hidden />
          <FilterChip
            pressed={invoiceFilter === "with"}
            onClick={() => onInvoiceFilter(invoiceFilter === "with" ? "all" : "with")}
          >
            With invoice {withCount}
          </FilterChip>
          <FilterChip
            pressed={invoiceFilter === "without"}
            onClick={() => onInvoiceFilter(invoiceFilter === "without" ? "all" : "without")}
          >
            Without invoice {withoutCount}
          </FilterChip>
          <FilterChip
            pressed={invoiceFilter === "none"}
            onClick={() => onInvoiceFilter(invoiceFilter === "none" ? "all" : "none")}
          >
            No invoice recorded {noneCount}
          </FilterChip>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading testimonials…</p>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          <p>{error}</p>
          <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-10" />}
          title={
            filteredEmpty
              ? invoiceFilter === "without"
                ? "Nothing left to hunt down"
                : invoiceFilter === "none"
                  ? "No testimonials marked as no invoice recorded"
                  : "No testimonials match these filters"
              : emptyTitle
          }
          description={
            filteredEmpty
              ? "Clear the invoice or status filter, or search a different name."
              : emptyDescription
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full table-fixed text-left text-sm">
              <colgroup>
                <col />
                {showType ? <col style={{ width: "13.5rem" }} /> : null}
                <col style={{ width: "9.5rem" }} />
                <col style={{ width: "7rem" }} />
                <col style={{ width: "11rem" }} />
                {showAdded ? <col style={{ width: "6rem" }} /> : null}
                <col style={{ width: "7.5rem" }} />
              </colgroup>
              <thead className="border-b border-gray-200 bg-gray-50 text-[10.5px] font-bold uppercase tracking-wider text-gray-400 dark:border-gray-700 dark:bg-gray-800/60">
                <tr>
                  <th className="px-3 py-2 font-bold">Member &amp; file</th>
                  {showType ? <th className="px-3 py-2 font-bold">Type</th> : null}
                  <th className="px-3 py-2 font-bold">Status</th>
                  <th className="px-3 py-2 font-bold">Savings</th>
                  <th className="px-3 py-2 font-bold">Invoice</th>
                  {showAdded ? <th className="px-3 py-2 font-bold">Added</th> : null}
                  <th className="px-3 py-2 font-bold"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map((ex) => {
                  const sheet = isSheetSourced(ex);
                  const known = (TESTIMONIAL_STATUSES as readonly string[]).includes(ex.status ?? "");
                  const statusOptions = known
                    ? TESTIMONIAL_STATUSES
                    : ex.status
                      ? [ex.status, ...TESTIMONIAL_STATUSES]
                      : [...TESTIMONIAL_STATUSES];
                  const invoice = ex.invoice_number?.trim() || "";
                  const invState = invoiceState(ex);
                  return (
                    <tr key={ex.id} className="align-middle">
                      <td className="px-3 py-2.5">
                        <p
                          className="truncate font-medium text-gray-900 dark:text-gray-100"
                          title={ex.business_name}
                        >
                          {ex.business_name}
                        </p>
                        <p className="truncate text-xs text-gray-500" title={ex.file_name}>
                          {sheet ? "Sheet register · " : ""}
                          {ex.file_name}
                        </p>
                      </td>
                      {showType ? (
                        <td className="px-3 py-2.5">
                          {solutionTypes && onTypeChange ? (
                            <div>
                              <select
                                value={rowSolutionTypeId(ex, solutionTypes) ?? UNCATEGORISED_FILTER}
                                onChange={(e) => {
                                  const next = e.target.value;
                                  if (next === UNCATEGORISED_FILTER) return;
                                  onTypeChange(ex.id, next);
                                }}
                                className="max-w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
                                aria-label={`Type for ${ex.business_name}`}
                              >
                                {rowSolutionTypeId(ex, solutionTypes) ? null : (
                                  <option value={UNCATEGORISED_FILTER}>Needs a real type</option>
                                )}
                                {solutionTypes.map((opt) => (
                                  <option key={opt.id} value={opt.id}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              {rowSolutionTypeId(ex, solutionTypes) ? null : (
                                <p
                                  className="mt-0.5 truncate text-[10px] text-amber-700 dark:text-amber-300"
                                  title={typeLabel(ex)}
                                >
                                  Sheet said: {typeLabel(ex)}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="truncate text-xs text-gray-700 dark:text-gray-300" title={typeLabel(ex)}>
                              {typeLabel(ex)}
                            </p>
                          )}
                        </td>
                      ) : null}
                      <td className="px-3 py-2.5">
                        <select
                          value={ex.status ?? ""}
                          onChange={(e) => onStatusChange(ex.id, e.target.value)}
                          className="max-w-full rounded-full border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400">
                        {ex.testimonial_savings || "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        {invState === "linked" ? (
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <button
                              type="button"
                              className="truncate text-xs font-semibold text-primary hover:underline"
                              title={`Open invoice ${invoice} PDF`}
                              onClick={() => onOpenInvoice?.(ex)}
                            >
                              {invoice}
                            </button>
                            <button
                              type="button"
                              onClick={() => onLinkInvoice(ex)}
                              className="text-[11px] font-semibold text-gray-500 hover:text-primary"
                            >
                              Change
                            </button>
                            <button
                              type="button"
                              onClick={() => onUnlinkInvoice(ex)}
                              className="text-[11px] font-semibold text-gray-500 hover:text-red-600"
                            >
                              Unlink
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <button
                              type="button"
                              onClick={() => onLinkInvoice(ex)}
                              className="text-xs font-semibold text-primary hover:underline"
                            >
                              Link invoice
                            </button>
                            {isMarkedNoInvoice(ex) ? (
                              <span className="text-[11px] text-gray-500">No invoice recorded</span>
                            ) : onMarkNoInvoice ? (
                              <button
                                type="button"
                                onClick={() => onMarkNoInvoice(ex)}
                                className="text-[11px] font-semibold text-gray-500 hover:text-primary"
                              >
                                No invoice recorded
                              </button>
                            ) : null}
                          </div>
                        )}
                      </td>
                      {showAdded ? (
                        <td className="px-3 py-2.5 text-xs text-gray-400">
                          {sheet ? "—" : formatDateAustralian(ex.created_at) || "—"}
                        </td>
                      ) : null}
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap items-center gap-1">
                          <a
                            href={driveFileUrl(ex)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-full px-2 py-1 text-xs font-semibold text-primary hover:underline"
                          >
                            Open
                          </a>
                          {sheet ? null : (
                            <button
                              type="button"
                              onClick={() => onDelete(ex)}
                              className="rounded-full px-2 py-1 text-xs font-semibold text-gray-500 hover:text-red-600"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">{footerNote}</p>
        </>
      )}
    </div>
  );
}
