"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getApiBaseUrl } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { RefreshCw, AlertCircle, ExternalLink, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const SHEET_ID = "1l_ShkAcpS1HBqX8EdXLEVmn3pkliVGwsskkkI0GlLho";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=379463966`;

export type DiscrepancyRow = {
  discrepancy_type: string;
  utility_identifier: string;
  linked_business_name: string;
  invoice_period: string;
  invoice_rate: string;
  contract_period: string;
  contract_rate: string;
  rate_difference: string;
  pct_difference: string;
  annual_quantity_gj: string;
  annual_potential_overcharge: string;
  take_or_pay_invoice: string;
};

export type ElectricityContractRow = {
  discrepancy_type: string;
  utility_identifier: string;
  linked_business_name: string;
  retailer: string;
  site_address: string;
  invoice_period: string;
  contract_period: string;
  peak_quantity_kwh: string;
  peak_contract_rate: string;
  peak_invoice_rate: string;
  peak_rate_difference: string;
  peak_pct_difference: string;
  shoulder_quantity_kwh: string;
  shoulder_contract_rate: string;
  shoulder_invoice_rate: string;
  shoulder_rate_difference: string;
  shoulder_pct_difference: string;
  off_peak_quantity_kwh: string;
  off_peak_contract_rate: string;
  off_peak_invoice_rate: string;
  off_peak_rate_difference: string;
  off_peak_pct_difference: string;
  service_charge_contract: string;
  service_charge_invoice: string;
  service_charge_difference: string;
  service_charge_pct_difference: string;
  contract_target_consumption_kwh: string;
  discrepancy_detected: string;
  notes: string;
};

export type DmaRow = {
  discrepancy_type: string;
  utility_identifier: string;
  linked_business_name: string;
  dma_annual_fee: string;
  dma_daily_rate: string;
  invoice_period: string;
  invoice_comparison_days: string;
  expected_charge: string;
  actual_invoice_charge: string;
  difference: string;
  status: string;
};

type ViewType = "gas" | "electricity_contract" | "dma" | "demand";

type ApiResponse = {
  rows: DiscrepancyRow[];
  utility_type: string;
  gas?: DiscrepancyRow[];
  electricity_contract?: ElectricityContractRow[];
  electricity_dma?: DmaRow[];
  electricity_demand_check?: Record<string, string>[];
};

type ColumnDef<T> = {
  key: keyof T;
  label: string;
  mono?: boolean;
  wide?: boolean;
};

const GAS_COLUMNS: ColumnDef<DiscrepancyRow>[] = [
  { key: "discrepancy_type", label: "Discrepancy type" },
  { key: "utility_identifier", label: "Utility ID (MRIN)", mono: true },
  { key: "linked_business_name", label: "Linked business" },
  { key: "invoice_period", label: "Invoice period" },
  { key: "invoice_rate", label: "Invoice rate" },
  { key: "contract_period", label: "Contract period" },
  { key: "contract_rate", label: "Contract rate" },
  { key: "rate_difference", label: "Rate diff." },
  { key: "pct_difference", label: "% diff." },
  { key: "annual_quantity_gj", label: "Annual Qty (GJ)" },
  { key: "annual_potential_overcharge", label: "Annual potential overcharge" },
  { key: "take_or_pay_invoice", label: "Take or Pay" },
];

const DMA_COLUMNS: ColumnDef<DmaRow>[] = [
  { key: "discrepancy_type", label: "Discrepancy type" },
  { key: "utility_identifier", label: "NMI", mono: true },
  { key: "linked_business_name", label: "Linked business", wide: true },
  { key: "dma_annual_fee", label: "DMA annual fee ($)" },
  { key: "dma_daily_rate", label: "DMA daily rate ($)" },
  { key: "invoice_period", label: "Invoice period" },
  { key: "invoice_comparison_days", label: "Comparison days" },
  { key: "expected_charge", label: "Expected charge ($)" },
  { key: "actual_invoice_charge", label: "Actual charge ($)" },
  { key: "difference", label: "Difference ($)" },
  { key: "status", label: "Status", wide: true },
];

type DetailField = { label: string; value: string };

type DetailSection = { title: string; fields: DetailField[] };

function parseViewType(raw: string | null): ViewType {
  const t = (raw ?? "gas").toLowerCase();
  if (t === "electricity" || t === "electricity_contract" || t === "contract") {
    return "electricity_contract";
  }
  if (t === "dma" || t === "electricity_dma") return "dma";
  if (t === "demand") return "demand";
  return "gas";
}

function cellValue(val: string | undefined): string {
  const v = (val ?? "").trim();
  return v || "—";
}

function isTruthyDetected(val: string | undefined): boolean {
  const v = (val ?? "").trim().toUpperCase();
  return v === "TRUE" || v === "YES" || v === "1";
}

function DiscrepancyDetectedBadge({ value }: { value: string | undefined }) {
  const v = (value ?? "").trim();
  if (!v) return <span>—</span>;
  const detected = isTruthyDetected(v);
  return (
    <Badge intent={detected ? "danger" : "success"}>
      {detected ? "Yes" : "No"}
    </Badge>
  );
}

function parseNumericCell(val: string | undefined): number | null {
  const raw = (val ?? "").trim().replace(/[$,%]/g, "");
  if (!raw || raw === "—") return null;
  const n = parseFloat(raw);
  return Number.isNaN(n) ? null : n;
}

function isDemandMismatch(row: Record<string, string>): boolean {
  const status = (row.status ?? "").toLowerCase();
  if (
    status.includes("❌") ||
    status.includes("mismatch") ||
    status.includes("issue") ||
    status.includes("overcharge")
  ) {
    return true;
  }
  for (const key of ["difference", "demand_difference"] as const) {
    const n = parseNumericCell(row[key]);
    if (n != null && Math.abs(n) > 0.001) return true;
  }
  return false;
}

function electricityRowId(row: ElectricityContractRow, index: number): string {
  return `contract-${row.utility_identifier}-${row.invoice_period}-${index}`;
}

function demandRowId(row: Record<string, string>, index: number): string {
  return `demand-${row.utility_identifier}-${row.review_type}-${index}`;
}

function buildElectricityDetailSections(row: ElectricityContractRow): DetailSection[] {
  return [
    {
      title: "Site & contract",
      fields: [
        { label: "Discrepancy type", value: cellValue(row.discrepancy_type) },
        { label: "Site address", value: cellValue(row.site_address) },
        { label: "Contract period", value: cellValue(row.contract_period) },
        { label: "Contract target (kWh)", value: cellValue(row.contract_target_consumption_kwh) },
      ],
    },
    {
      title: "Peak",
      fields: [
        { label: "Quantity (kWh)", value: cellValue(row.peak_quantity_kwh) },
        { label: "Contract rate (c/kWh)", value: cellValue(row.peak_contract_rate) },
        { label: "Invoice rate (c/kWh)", value: cellValue(row.peak_invoice_rate) },
        { label: "Rate difference", value: cellValue(row.peak_rate_difference) },
        { label: "% difference", value: cellValue(row.peak_pct_difference) },
      ],
    },
    {
      title: "Shoulder",
      fields: [
        { label: "Quantity (kWh)", value: cellValue(row.shoulder_quantity_kwh) },
        { label: "Contract rate (c/kWh)", value: cellValue(row.shoulder_contract_rate) },
        { label: "Invoice rate (c/kWh)", value: cellValue(row.shoulder_invoice_rate) },
        { label: "Rate difference", value: cellValue(row.shoulder_rate_difference) },
        { label: "% difference", value: cellValue(row.shoulder_pct_difference) },
      ],
    },
    {
      title: "Off-peak",
      fields: [
        { label: "Quantity (kWh)", value: cellValue(row.off_peak_quantity_kwh) },
        { label: "Contract rate (c/kWh)", value: cellValue(row.off_peak_contract_rate) },
        { label: "Invoice rate (c/kWh)", value: cellValue(row.off_peak_invoice_rate) },
        { label: "Rate difference", value: cellValue(row.off_peak_rate_difference) },
        { label: "% difference", value: cellValue(row.off_peak_pct_difference) },
      ],
    },
    {
      title: "Service charge",
      fields: [
        { label: "Contract ($)", value: cellValue(row.service_charge_contract) },
        { label: "Invoice ($)", value: cellValue(row.service_charge_invoice) },
        { label: "Difference", value: cellValue(row.service_charge_difference) },
        { label: "% difference", value: cellValue(row.service_charge_pct_difference) },
      ],
    },
  ];
}

function buildDemandDetailSections(row: Record<string, string>): DetailSection[] {
  return [
    {
      title: "Site",
      fields: [
        { label: "Site address", value: cellValue(row.site_address) },
        { label: "Network provider", value: cellValue(row.network_provider) },
        { label: "Demand type", value: cellValue(row.demand_type) },
      ],
    },
    {
      title: "Demand (kW)",
      fields: [
        { label: "Highest invoice demand", value: cellValue(row.highest_invoice_demand) },
        { label: "Actual interval demand", value: cellValue(row.actual_interval_demand) },
        { label: "Demand difference", value: cellValue(row.demand_difference) },
      ],
    },
    {
      title: "Charges ($)",
      fields: [
        { label: "Actual invoice charge", value: cellValue(row.actual_invoice_charge) },
        { label: "Expected charge", value: cellValue(row.expected_charge) },
        { label: "Difference", value: cellValue(row.difference) },
      ],
    },
  ];
}

function RowDetailPanel({ sections }: { sections: DetailSection[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-4 bg-gray-1 dark:bg-dark-2 border-t border-stroke dark:border-dark-3">
      {sections.map((section) => (
        <div key={section.title} className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {section.title}
          </h4>
          <dl className="space-y-1.5">
            {section.fields.map((field) => (
              <div key={field.label} className="flex flex-col gap-0.5">
                <dt className="text-xs text-gray-500 dark:text-gray-400">{field.label}</dt>
                <dd className="text-sm text-dark dark:text-white break-words">{field.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

function ExpandToggleButton({
  expanded,
  onClick,
  label,
}: {
  expanded: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-dark dark:hover:text-white"
      aria-expanded={expanded}
      aria-label={label}
    >
      {expanded ? (
        <ChevronDown className="h-4 w-4 shrink-0" />
      ) : (
        <ChevronRight className="h-4 w-4 shrink-0" />
      )}
    </button>
  );
}

function ElectricityContractTable({
  rows,
  expandedIds,
  onToggleExpand,
}: {
  rows: ElectricityContractRow[];
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
}) {
  const colCount = 7;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10" />
          <TableHead className="text-xs">NMI</TableHead>
          <TableHead className="text-xs min-w-[140px]">Linked business</TableHead>
          <TableHead className="text-xs">Retailer</TableHead>
          <TableHead className="text-xs">Invoice period</TableHead>
          <TableHead className="text-xs">Discrepancy</TableHead>
          <TableHead className="text-xs min-w-[200px]">Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => {
          const id = electricityRowId(row, i);
          const expanded = expandedIds.has(id);
          const detected = isTruthyDetected(row.discrepancy_detected);
          const notes = cellValue(row.notes);
          return (
            <React.Fragment key={id}>
              <TableRow
                className={cn(
                  detected && "bg-red-50/60 dark:bg-red-900/10",
                  expanded && "border-b-0"
                )}
              >
                <TableCell className="align-top py-2">
                  <ExpandToggleButton
                    expanded={expanded}
                    onClick={() => onToggleExpand(id)}
                    label={expanded ? "Collapse row details" : "Expand row details"}
                  />
                </TableCell>
                <TableCell className="font-mono text-sm align-top">{cellValue(row.utility_identifier)}</TableCell>
                <TableCell className="text-sm align-top">{cellValue(row.linked_business_name)}</TableCell>
                <TableCell className="text-sm align-top">{cellValue(row.retailer)}</TableCell>
                <TableCell className="text-sm align-top whitespace-nowrap">{cellValue(row.invoice_period)}</TableCell>
                <TableCell className="align-top">
                  <DiscrepancyDetectedBadge value={row.discrepancy_detected} />
                </TableCell>
                <TableCell
                  className={cn(
                    "text-sm align-top max-w-[280px]",
                    notes.includes("⚠") && "text-amber-700 dark:text-amber-400"
                  )}
                  title={notes}
                >
                  <span className="line-clamp-2">{notes}</span>
                </TableCell>
              </TableRow>
              {expanded && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={colCount} className="p-0">
                    <RowDetailPanel sections={buildElectricityDetailSections(row)} />
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}

function DemandCheckTable({
  rows,
  expandedIds,
  onToggleExpand,
}: {
  rows: Record<string, string>[];
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
}) {
  const colCount = 6;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10" />
          <TableHead className="text-xs">NMI</TableHead>
          <TableHead className="text-xs min-w-[140px]">Linked business</TableHead>
          <TableHead className="text-xs min-w-[160px]">Review type</TableHead>
          <TableHead className="text-xs">Risk / opportunity</TableHead>
          <TableHead className="text-xs min-w-[120px]">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => {
          const id = demandRowId(row, i);
          const expanded = expandedIds.has(id);
          const mismatch = isDemandMismatch(row);
          const status = cellValue(row.status);
          return (
            <React.Fragment key={id}>
              <TableRow
                className={cn(mismatch && "bg-amber-50/60 dark:bg-amber-900/10", expanded && "border-b-0")}
              >
                <TableCell className="align-top py-2">
                  <ExpandToggleButton
                    expanded={expanded}
                    onClick={() => onToggleExpand(id)}
                    label={expanded ? "Collapse row details" : "Expand row details"}
                  />
                </TableCell>
                <TableCell className="font-mono text-sm align-top">{cellValue(row.utility_identifier)}</TableCell>
                <TableCell className="text-sm align-top">{cellValue(row.linked_business_name)}</TableCell>
                <TableCell className="text-sm align-top">{cellValue(row.review_type)}</TableCell>
                <TableCell className="text-sm align-top">{cellValue(row.risk_or_opportunity)}</TableCell>
                <TableCell
                  className={cn(
                    "text-sm align-top",
                    mismatch ? "text-amber-700 dark:text-amber-400" : "text-green-700 dark:text-green-300"
                  )}
                  title={status}
                >
                  <span className="line-clamp-2">{status}</span>
                </TableCell>
              </TableRow>
              {expanded && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={colCount} className="p-0">
                    <RowDetailPanel sections={buildDemandDetailSections(row)} />
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}

function DataTable<T extends Record<string, string>>({
  columns,
  rows,
  rowKey,
  rowClassName,
  renderCell,
}: {
  columns: ColumnDef<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  rowClassName?: (row: T) => string | undefined;
  renderCell?: (row: T, key: keyof T) => React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto -mx-2">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead
                key={String(col.key)}
                className={cn(
                  "whitespace-nowrap text-xs",
                  col.wide && "min-w-[160px]"
                )}
              >
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={rowKey(row, i)} className={rowClassName?.(row)}>
              {columns.map((col) => (
                <TableCell
                  key={String(col.key)}
                  className={cn(
                    "text-sm align-top",
                    col.mono && "font-mono",
                    col.wide && "min-w-[160px] max-w-[280px] whitespace-normal"
                  )}
                  title={
                    col.wide ? cellValue(row[col.key]) : undefined
                  }
                >
                  {renderCell
                    ? renderCell(row, col.key)
                    : cellValue(row[col.key])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function DiscrepancyCheckPage() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const token = (session as { id_token?: string; accessToken?: string })?.id_token
    ?? (session as { id_token?: string; accessToken?: string })?.accessToken;
  const { showToast } = useToast();

  const [rows, setRows] = useState<DiscrepancyRow[]>([]);
  const [electricityContractRows, setElectricityContractRows] = useState<ElectricityContractRow[]>([]);
  const [electricityDmaRows, setElectricityDmaRows] = useState<DmaRow[]>([]);
  const [electricityDemandCheckRows, setElectricityDemandCheckRows] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialBusinessName = searchParams.get("business_name") ?? searchParams.get("businessName") ?? "";
  const initialIdentifier = searchParams.get("identifier") ?? searchParams.get("utility_identifier") ?? "";
  const [filterBusinessName, setFilterBusinessName] = useState(initialBusinessName);
  const [filterIdentifier, setFilterIdentifier] = useState(initialIdentifier);
  const [viewType, setViewType] = useState<ViewType>(() =>
    parseViewType(searchParams.get("type"))
  );
  const [showOnlyMismatchesElectricity, setShowOnlyMismatchesElectricity] = useState(false);
  const [showOnlyMismatchesDemand, setShowOnlyMismatchesDemand] = useState(false);
  const [expandedElectricityIds, setExpandedElectricityIds] = useState<Set<string>>(new Set());
  const [expandedDemandIds, setExpandedDemandIds] = useState<Set<string>>(new Set());

  const toggleElectricityExpand = useCallback((id: string) => {
    setExpandedElectricityIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleDemandExpand = useCallback((id: string) => {
    setExpandedDemandIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const fetchData = useCallback(async () => {
    if (!token) {
      setError("Please sign in to load discrepancy data.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const base = getApiBaseUrl();
      const params = new URLSearchParams();
      const businessNameParam = filterBusinessName.trim();
      if (businessNameParam) params.set("business_name", businessNameParam);
      const url = `${base}/api/resources/discrepancy-check${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { detail?: string }).detail || `Request failed: ${res.status}`);
      }
      const data: ApiResponse = await res.json();
      setRows(data.rows ?? data.gas ?? []);
      setElectricityContractRows((data.electricity_contract ?? []) as ElectricityContractRow[]);
      setElectricityDmaRows((data.electricity_dma ?? []) as DmaRow[]);
      setElectricityDemandCheckRows(data.electricity_demand_check ?? []);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load discrepancy data.";
      setError(message);
      showToast(message, "error");
      setRows([]);
      setElectricityContractRows([]);
      setElectricityDmaRows([]);
    } finally {
      setLoading(false);
    }
  }, [token, filterBusinessName, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const idFilter = filterIdentifier.trim().toLowerCase();
  const filterById = useCallback(
    (r: { utility_identifier?: string }) => {
      if (!idFilter) return true;
      return (r.utility_identifier ?? "").toLowerCase().includes(idFilter);
    },
    [idFilter]
  );

  const filteredRows = useMemo(
    () => (idFilter ? rows.filter(filterById) : rows),
    [rows, filterById, idFilter]
  );

  const filteredElectricityContract = useMemo(
    () => (idFilter ? electricityContractRows.filter(filterById) : electricityContractRows),
    [electricityContractRows, filterById, idFilter]
  );

  const filteredElectricityDma = useMemo(
    () => (idFilter ? electricityDmaRows.filter(filterById) : electricityDmaRows),
    [electricityDmaRows, filterById, idFilter]
  );

  const filteredDemandCheck = useMemo(
    () => (idFilter ? electricityDemandCheckRows.filter(filterById) : electricityDemandCheckRows),
    [electricityDemandCheckRows, filterById, idFilter]
  );

  const parseEndDate = useCallback((period: string): number => {
    if (!period?.trim()) return 0;
    const part = period.includes("-") ? period.split("-").pop()?.trim() : period.trim();
    const [d, m, y] = (part ?? "").split("/").map(Number);
    if (!y || !m || !d) return 0;
    return new Date(y, m - 1, d).getTime();
  }, []);

  const sortByInvoicePeriod = useCallback(
    <T extends { invoice_period?: string }>(list: T[]) =>
      [...list].sort((a, b) => {
        const timeA = parseEndDate(a.invoice_period ?? "");
        const timeB = parseEndDate(b.invoice_period ?? "");
        return timeB - timeA;
      }),
    [parseEndDate]
  );

  const sortedRows = useMemo(() => sortByInvoicePeriod(filteredRows), [filteredRows, sortByInvoicePeriod]);
  const sortedElectricityContract = useMemo(
    () => sortByInvoicePeriod(filteredElectricityContract),
    [filteredElectricityContract, sortByInvoicePeriod]
  );
  const sortedElectricityDma = useMemo(
    () => sortByInvoicePeriod(filteredElectricityDma),
    [filteredElectricityDma, sortByInvoicePeriod]
  );

  const displayedElectricityContract = useMemo(() => {
    if (!showOnlyMismatchesElectricity) return sortedElectricityContract;
    return sortedElectricityContract.filter((r) => isTruthyDetected(r.discrepancy_detected));
  }, [sortedElectricityContract, showOnlyMismatchesElectricity]);

  const sortedDemandCheck = useMemo(
    () =>
      [...filteredDemandCheck].sort((a, b) => {
        const idA = (a.utility_identifier ?? "").toLowerCase();
        const idB = (b.utility_identifier ?? "").toLowerCase();
        return idA.localeCompare(idB);
      }),
    [filteredDemandCheck]
  );

  const displayedDemandCheck = useMemo(() => {
    if (!showOnlyMismatchesDemand) return sortedDemandCheck;
    return sortedDemandCheck.filter(isDemandMismatch);
  }, [sortedDemandCheck, showOnlyMismatchesDemand]);

  const rowCountGas = sortedRows.length;
  const rowCountContract = displayedElectricityContract.length;
  const rowCountContractTotal = sortedElectricityContract.length;
  const rowCountDma = sortedElectricityDma.length;
  const rowCountDemand = displayedDemandCheck.length;
  const rowCountDemandTotal = sortedDemandCheck.length;

  const activeRowCount =
    viewType === "gas"
      ? rowCountGas
      : viewType === "electricity_contract"
        ? rowCountContract
        : viewType === "dma"
          ? rowCountDma
          : rowCountDemand;

  const viewDescriptions: Record<ViewType, string> = {
    gas: "C&I Gas invoice vs contract rates from the sheet.",
    electricity_contract:
      "Invoice vs contract checks. Expand a row for peak, shoulder, off-peak, and service charge detail.",
    dma: "DMA fee checks — expected vs actual invoice charges per billing period.",
    demand: "Interval demand vs invoice checks. Expand a row for site, demand, and charge detail.",
  };

  return (
    <div className="space-y-4 max-w-[min(100%,1600px)]">
      <Breadcrumb />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-heading-3 font-bold text-dark dark:text-white">
            Discrepancy Check
          </h1>
          <p className="text-body-sm text-gray-600 dark:text-gray-400 mt-0.5">
            Gas, C&I Electricity (contract), DMA, and demand checks from the sheet. Filter by business name or utility identifier (NMI / MRIN).
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={SHEET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-stroke dark:border-dark-3 bg-white dark:bg-gray-dark text-dark dark:text-white hover:bg-gray-50 dark:hover:bg-dark-2 text-sm"
          >
            <ExternalLink className="h-4 w-4" />
            Open Google Sheet
          </a>
          <button
            type="button"
            onClick={() => fetchData()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-stroke dark:border-dark-3 bg-white dark:bg-gray-dark text-dark dark:text-white hover:bg-gray-50 dark:hover:bg-dark-2 disabled:opacity-50 text-sm"
          >
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <Card className="border border-stroke dark:border-dark-3">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap gap-4 items-center">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              Type
              <select
                value={viewType}
                onChange={(e) => setViewType(e.target.value as ViewType)}
                className="border border-stroke dark:border-dark-3 rounded-md px-2 py-1.5 bg-white dark:bg-gray-dark text-dark dark:text-white text-sm max-w-[280px]"
              >
                <option value="gas">C&I Gas</option>
                <option value="electricity_contract">C&I Electricity (Contract)</option>
                <option value="dma">DMA</option>
                <option value="demand">Demand Check</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              Business name
              <input
                type="text"
                value={filterBusinessName}
                onChange={(e) => setFilterBusinessName(e.target.value)}
                placeholder="Filter by Linked Business Name"
                className="border border-stroke dark:border-dark-3 rounded-md px-2 py-1.5 bg-white dark:bg-gray-dark text-dark dark:text-white text-sm min-w-[180px]"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              Utility identifier (NMI / MRIN)
              <input
                type="text"
                value={filterIdentifier}
                onChange={(e) => setFilterIdentifier(e.target.value)}
                placeholder="Filter by identifier"
                className="border border-stroke dark:border-dark-3 rounded-md px-2 py-1.5 bg-white dark:bg-gray-dark text-dark dark:text-white text-sm min-w-[140px]"
              />
            </label>
            {viewType === "electricity_contract" && (
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyMismatchesElectricity}
                  onChange={(e) => setShowOnlyMismatchesElectricity(e.target.checked)}
                  className="rounded border-stroke dark:border-dark-3"
                />
                Show only mismatches
              </label>
            )}
            {viewType === "demand" && (
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyMismatchesDemand}
                  onChange={(e) => setShowOnlyMismatchesDemand(e.target.checked)}
                  className="rounded border-stroke dark:border-dark-3"
                />
                Show only issues
              </label>
            )}
            {(filterBusinessName.trim() ||
              filterIdentifier.trim() ||
              showOnlyMismatchesElectricity ||
              showOnlyMismatchesDemand) && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {filterBusinessName.trim() ? "Business filter applied on server. " : ""}
                {activeRowCount} row(s)
                {viewType === "electricity_contract" &&
                showOnlyMismatchesElectricity &&
                rowCountContractTotal !== rowCountContract
                  ? ` of ${rowCountContractTotal}`
                  : ""}
                {viewType === "demand" &&
                showOnlyMismatchesDemand &&
                rowCountDemandTotal !== rowCountDemand
                  ? ` of ${rowCountDemandTotal}`
                  : ""}
                {viewType !== "demand" ? ". Sorted by most recent invoice period first." : "."}
              </span>
            )}
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            {viewDescriptions[viewType]}
          </p>

          {loading ? (
            <p className="text-sm text-gray-500 py-4">Loading…</p>
          ) : viewType === "gas" ? (
            rowCountGas === 0 ? (
              <p className="text-sm text-gray-500 italic py-4">
                No C&I Gas discrepancy rows match the filters.
              </p>
            ) : (
              <>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Sorted by most recent invoice period at top.
                </p>
                <DataTable columns={GAS_COLUMNS} rows={sortedRows} rowKey={(r, i) => `${r.utility_identifier}-${i}`} />
              </>
            )
          ) : viewType === "electricity_contract" ? (
            rowCountContractTotal === 0 ? (
              <p className="text-sm text-gray-500 italic py-4">
                No C&I Electricity contract rows match the filters.
              </p>
            ) : rowCountContract === 0 ? (
              <p className="text-sm text-gray-500 italic py-4">
                No mismatches in the current filter set. Turn off &quot;Show only mismatches&quot; to see all rows.
              </p>
            ) : (
              <>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {rowCountContract} row(s). Click the arrow on a row to view peak, shoulder, off-peak, and service charge detail.
                </p>
                <ElectricityContractTable
                  rows={displayedElectricityContract}
                  expandedIds={expandedElectricityIds}
                  onToggleExpand={toggleElectricityExpand}
                />
              </>
            )
          ) : viewType === "dma" ? (
            rowCountDma === 0 ? (
              <p className="text-sm text-gray-500 italic py-4">
                No DMA discrepancy rows match the filters.
              </p>
            ) : (
              <>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {rowCountDma} row(s). Mismatch rows show status from the sheet.
                </p>
                <DataTable
                  columns={DMA_COLUMNS}
                  rows={sortedElectricityDma}
                  rowKey={(r, i) => `dma-${r.utility_identifier}-${i}`}
                  rowClassName={(r) =>
                    (r.status ?? "").includes("❌") ? "bg-red-50/60 dark:bg-red-900/10" : undefined
                  }
                  renderCell={(row, key) => {
                    if (key === "status") {
                      const status = cellValue(row.status);
                      const mismatch = status.includes("❌") || status.toLowerCase().includes("mismatch");
                      return (
                        <span
                          className={cn(
                            "whitespace-normal",
                            mismatch
                              ? "text-red-700 dark:text-red-300"
                              : "text-green-700 dark:text-green-300"
                          )}
                        >
                          {status}
                        </span>
                      );
                    }
                    return cellValue(row[key]);
                  }}
                />
              </>
            )
          ) : rowCountDemandTotal === 0 ? (
            <p className="text-sm text-gray-500 italic py-4">
              No Demand Check rows match the filters.
            </p>
          ) : rowCountDemand === 0 ? (
            <p className="text-sm text-gray-500 italic py-4">
              No issues in the current filter set. Turn off &quot;Show only issues&quot; to see all rows.
            </p>
          ) : (
            <>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {rowCountDemand} row(s). Click the arrow on a row to view site, demand, and charge detail.
              </p>
              <DemandCheckTable
                rows={displayedDemandCheck}
                expandedIds={expandedDemandIds}
                onToggleExpand={toggleDemandExpand}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


