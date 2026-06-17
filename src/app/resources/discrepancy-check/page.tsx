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
import {
  type DiscrepancyCheckViewType,
  type DiscrepancyRow,
  type DmaRow,
  type ElectricityContractRow,
  isDemandMismatch,
  isDmaMismatch,
  isGasOvercharged,
  isTruthyDetected,
  parseDiscrepancyViewType,
  parseNumericCell,
  rowHasAnyValue,
  shouldDefaultMismatchFilter,
  sortByInvoicePeriod,
} from "@/lib/discrepancy-utils";

export type { DiscrepancyRow, ElectricityContractRow, DmaRow };

const SHEET_ID = "1l_ShkAcpS1HBqX8EdXLEVmn3pkliVGwsskkkI0GlLho";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=379463966`;

type ViewType = DiscrepancyCheckViewType;

type ApiResponse = {
  rows: DiscrepancyRow[];
  utility_type: string;
  gas?: DiscrepancyRow[];
  electricity_contract?: ElectricityContractRow[];
  electricity_dma?: DmaRow[];
  electricity_demand_check?: Record<string, string>[];
};

type DetailField = { label: string; value: string };

type DetailSection = { title: string; fields: DetailField[] };

function cellValue(val: string | undefined): string {
  const v = (val ?? "").trim();
  return v || "—";
}

// --- Take-or-Pay tracking (gas) ---
type GasTopFields = {
  agreement_year?: string; maq_gj?: string; cpq_gj?: string; invoices_counted?: string;
  consumption_to_date_gj?: string; data_through?: string; days_elapsed?: string;
  agreement_year_days?: string; pct_year_elapsed?: string; pct_maq_consumed?: string;
  pace?: string; projected_annual_gj?: string; projected_vs_maq_gj?: string; risk_band?: string;
};
const gasTop = (row: DiscrepancyRow): GasTopFields => row as unknown as GasTopFields;

function hasTakeOrPayTracking(row: DiscrepancyRow): boolean {
  const t = gasTop(row);
  return Boolean((t.risk_band && t.risk_band.trim()) || (t.maq_gj && t.maq_gj.trim()) || (t.pct_maq_consumed && t.pct_maq_consumed.trim()));
}
function riskBandIntent(riskBand: string | undefined): "danger" | "warning" | "success" | null {
  const v = (riskBand ?? "").trim().toLowerCase();
  if (!v) return null;
  if (v.startsWith("at risk")) return "danger";
  if (v.startsWith("tight")) return "warning";
  if (v.startsWith("on track")) return "success";
  return null;
}
function shortRiskBand(riskBand: string | undefined): string {
  const v = (riskBand ?? "").trim();
  if (!v) return "";
  return v.split("—")[0].split("-")[0].trim() || v;
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

function HighlightedValue({ value, highlight }: { value: string; highlight: boolean }) {
  return (
    <span className={cn("tabular-nums", highlight && "font-semibold text-red-600 dark:text-red-400")}>
      {value}
    </span>
  );
}

function gasRowId(row: DiscrepancyRow, index: number): string {
  return `gas-${row.utility_identifier}-${row.invoice_period}-${index}`;
}

function dmaRowId(row: DmaRow, index: number): string {
  return `dma-${row.utility_identifier}-${row.invoice_period}-${index}`;
}

function electricityRowId(row: ElectricityContractRow, index: number): string {
  return `contract-${row.utility_identifier}-${row.invoice_period}-${index}`;
}

function demandRowId(row: Record<string, string>, index: number): string {
  return `demand-${row.utility_identifier}-${row.review_type}-${index}`;
}

function buildGasDetailSections(row: DiscrepancyRow): DetailSection[] {
  const t = gasTop(row);
  const sections: DetailSection[] = [
    {
      title: "Rates",
      fields: [
        { label: "Discrepancy type", value: cellValue(row.discrepancy_type) },
        { label: "Invoice rate", value: cellValue(row.invoice_rate) },
        { label: "Contract rate", value: cellValue(row.contract_rate) },
        { label: "Contract period", value: cellValue(row.contract_period) },
      ],
    },
    {
      title: "Annual & take-or-pay",
      fields: [
        { label: "Annual quantity (GJ)", value: cellValue(row.annual_quantity_gj) },
        { label: "Take or pay invoice", value: cellValue(row.take_or_pay_invoice) },
      ],
    },
  ];

  if (hasTakeOrPayTracking(row)) {
    sections.push({
      title: "Take-or-Pay — Year to Date",
      fields: [
        { label: "Agreement year", value: cellValue(t.agreement_year) },
        { label: "Consumed to date (GJ)", value: cellValue(t.consumption_to_date_gj) },
        { label: "Invoices counted", value: cellValue(t.invoices_counted) },
        { label: "Data through", value: cellValue(t.data_through) },
        { label: "MAQ floor (GJ)", value: cellValue(t.maq_gj) },
        { label: "CPQ (GJ)", value: cellValue(t.cpq_gj) },
        { label: "% MAQ consumed", value: cellValue(t.pct_maq_consumed) },
        { label: "% year elapsed", value: cellValue(t.pct_year_elapsed) },
        { label: "Pace", value: cellValue(t.pace) },
        { label: "Projected annual (GJ)", value: cellValue(t.projected_annual_gj) },
        { label: "Projected vs MAQ (GJ)", value: cellValue(t.projected_vs_maq_gj) },
        { label: "Risk band", value: cellValue(t.risk_band) },
      ],
    });
  }
  return sections;
}

function buildDmaDetailSections(row: DmaRow): DetailSection[] {
  return [
    {
      title: "DMA fees",
      fields: [
        { label: "Discrepancy type", value: cellValue(row.discrepancy_type) },
        { label: "DMA annual fee ($)", value: cellValue(row.dma_annual_fee) },
        { label: "DMA daily rate ($)", value: cellValue(row.dma_daily_rate) },
        { label: "Comparison days", value: cellValue(row.invoice_comparison_days) },
      ],
    },
    {
      title: "Status",
      fields: [{ label: "Full status", value: cellValue(row.status) }],
    },
  ];
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
        { label: "Status", value: cellValue(row.status) },
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

function GasTable({
  rows,
  expandedIds,
  onToggleExpand,
}: {
  rows: DiscrepancyRow[];
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
}) {
  const colCount = 8;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10" />
          <TableHead className="text-xs">MRIN</TableHead>
          <TableHead className="text-xs min-w-[140px]">Linked business</TableHead>
          <TableHead className="text-xs">Invoice period</TableHead>
          <TableHead className="text-xs">Rate diff.</TableHead>
          <TableHead className="text-xs">% diff.</TableHead>
          <TableHead className="text-xs">Annual overcharge ($)</TableHead>
          <TableHead className="text-xs min-w-[110px]">ToP status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => {
          const id = gasRowId(row, i);
          const expanded = expandedIds.has(id);
          const overcharged = isGasOvercharged(row);
          return (
            <React.Fragment key={id}>
              <TableRow
                className={cn(overcharged && "bg-red-50/60 dark:bg-red-900/10", expanded && "border-b-0")}
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
                <TableCell className="text-sm align-top whitespace-nowrap">{cellValue(row.invoice_period)}</TableCell>
                <TableCell className="text-sm align-top">
                  <HighlightedValue value={cellValue(row.rate_difference)} highlight={overcharged} />
                </TableCell>
                <TableCell className="text-sm align-top">
                  <HighlightedValue value={cellValue(row.pct_difference)} highlight={overcharged} />
                </TableCell>
                <TableCell className="text-sm align-top">
                  <HighlightedValue
                    value={cellValue(row.annual_potential_overcharge)}
                    highlight={overcharged}
                  />
                </TableCell>
                <TableCell className="align-top">
                  {hasTakeOrPayTracking(row) ? (
                    riskBandIntent(gasTop(row).risk_band) ? (
                      <Badge intent={riskBandIntent(gasTop(row).risk_band)!}>{shortRiskBand(gasTop(row).risk_band)}</Badge>
                    ) : (
                      <span className="text-sm text-dark dark:text-white">{cellValue(gasTop(row).risk_band)}</span>
                    )
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">—</span>
                  )}
                </TableCell>
              </TableRow>
              {expanded && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={colCount} className="p-0">
                    <RowDetailPanel sections={buildGasDetailSections(row)} />
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

function DmaTable({
  rows,
  expandedIds,
  onToggleExpand,
}: {
  rows: DmaRow[];
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
}) {
  const colCount = 8;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10" />
          <TableHead className="text-xs">NMI</TableHead>
          <TableHead className="text-xs min-w-[140px]">Linked business</TableHead>
          <TableHead className="text-xs">Invoice period</TableHead>
          <TableHead className="text-xs">Expected ($)</TableHead>
          <TableHead className="text-xs">Actual ($)</TableHead>
          <TableHead className="text-xs">Difference ($)</TableHead>
          <TableHead className="text-xs w-[100px]">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => {
          const id = dmaRowId(row, i);
          const expanded = expandedIds.has(id);
          const mismatch = isDmaMismatch(row);
          return (
            <React.Fragment key={id}>
              <TableRow
                className={cn(mismatch && "bg-red-50/60 dark:bg-red-900/10", expanded && "border-b-0")}
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
                <TableCell className="text-sm align-top whitespace-nowrap">{cellValue(row.invoice_period)}</TableCell>
                <TableCell className="text-sm align-top tabular-nums">{cellValue(row.expected_charge)}</TableCell>
                <TableCell className="text-sm align-top tabular-nums">{cellValue(row.actual_invoice_charge)}</TableCell>
                <TableCell className="text-sm align-top tabular-nums">
                  <HighlightedValue value={cellValue(row.difference)} highlight={mismatch} />
                </TableCell>
                <TableCell className="align-top">
                  <Badge intent={mismatch ? "danger" : "success"}>{mismatch ? "Mismatch" : "OK"}</Badge>
                </TableCell>
              </TableRow>
              {expanded && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={colCount} className="p-0">
                    <RowDetailPanel sections={buildDmaDetailSections(row)} />
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
          <TableHead className="text-xs min-w-[100px]">Status</TableHead>
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
                <TableCell className="align-top">
                  {status === "—" ? (
                    <span>—</span>
                  ) : (
                    <Badge intent={mismatch ? "warning" : "success"}>
                      {mismatch ? "Review" : "OK"}
                    </Badge>
                  )}
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
  const initialViewType = parseDiscrepancyViewType(searchParams.get("type"));
  const hasIdentifierDeepLink = initialIdentifier.trim().length > 0;
  const defaultMismatchFilter = shouldDefaultMismatchFilter(
    hasIdentifierDeepLink,
    initialViewType,
    searchParams.get("mismatches_only")
  );
  const [filterBusinessName, setFilterBusinessName] = useState(initialBusinessName);
  const [filterIdentifier, setFilterIdentifier] = useState(initialIdentifier);
  const [viewType, setViewType] = useState<ViewType>(() => initialViewType);
  const [showOnlyOverchargedGas, setShowOnlyOverchargedGas] = useState(true);
  const [showOnlyMismatchesElectricity, setShowOnlyMismatchesElectricity] = useState(
    defaultMismatchFilter && initialViewType === "electricity_contract"
  );
  const [showOnlyMismatchesDma, setShowOnlyMismatchesDma] = useState(
    defaultMismatchFilter && initialViewType === "dma"
  );
  const [showOnlyMismatchesDemand, setShowOnlyMismatchesDemand] = useState(false);
  const [expandedGasIds, setExpandedGasIds] = useState<Set<string>>(new Set());
  const [expandedDmaIds, setExpandedDmaIds] = useState<Set<string>>(new Set());
  const [expandedElectricityIds, setExpandedElectricityIds] = useState<Set<string>>(new Set());
  const [expandedDemandIds, setExpandedDemandIds] = useState<Set<string>>(new Set());

  const toggleGasExpand = useCallback((id: string) => {
    setExpandedGasIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleDmaExpand = useCallback((id: string) => {
    setExpandedDmaIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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

  const filteredDemandCheck = useMemo(() => {
    const withId = idFilter
      ? electricityDemandCheckRows.filter(filterById)
      : electricityDemandCheckRows;
    return withId.filter(rowHasAnyValue);
  }, [electricityDemandCheckRows, filterById, idFilter]);

  const sortedRows = useMemo(() => sortByInvoicePeriod(filteredRows), [filteredRows]);

  const displayedGasRows = useMemo(() => {
    if (!showOnlyOverchargedGas) return sortedRows;
    return sortedRows.filter(isGasOvercharged);
  }, [sortedRows, showOnlyOverchargedGas]);
  const sortedElectricityContract = useMemo(
    () => sortByInvoicePeriod(filteredElectricityContract),
    [filteredElectricityContract]
  );
  const sortedElectricityDma = useMemo(
    () => sortByInvoicePeriod(filteredElectricityDma),
    [filteredElectricityDma]
  );

  const displayedDmaRows = useMemo(() => {
    if (!showOnlyMismatchesDma) return sortedElectricityDma;
    return sortedElectricityDma.filter(isDmaMismatch);
  }, [sortedElectricityDma, showOnlyMismatchesDma]);

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

  const rowCountGas = displayedGasRows.length;
  const rowCountGasTotal = sortedRows.length;
  const rowCountContract = displayedElectricityContract.length;
  const rowCountContractTotal = sortedElectricityContract.length;
  const rowCountDma = displayedDmaRows.length;
  const rowCountDmaTotal = sortedElectricityDma.length;
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

  const demandRowsLookUnmapped =
    viewType === "demand" &&
    electricityDemandCheckRows.length > 0 &&
    filteredDemandCheck.length === 0;

  const viewDescriptions: Record<ViewType, string> = {
    gas: "Invoice vs contract gas rates. Expand a row for full rate and contract detail. Overcharge columns are highlighted in red.",
    electricity_contract:
      "Invoice vs contract checks. Expand a row for peak, shoulder, off-peak, and service charge detail.",
    dma: "DMA fee checks — expected vs actual charges. Expand a row for fees and the full status message.",
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
            {viewType === "gas" && (
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyOverchargedGas}
                  onChange={(e) => setShowOnlyOverchargedGas(e.target.checked)}
                  className="rounded border-stroke dark:border-dark-3"
                />
                Hide zero overcharge
              </label>
            )}
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
            {viewType === "dma" && (
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyMismatchesDma}
                  onChange={(e) => setShowOnlyMismatchesDma(e.target.checked)}
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
              showOnlyOverchargedGas ||
              showOnlyMismatchesElectricity ||
              showOnlyMismatchesDma ||
              showOnlyMismatchesDemand) && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {filterBusinessName.trim() ? "Business filter applied on server. " : ""}
                {activeRowCount} row(s)
                {viewType === "gas" &&
                showOnlyOverchargedGas &&
                rowCountGasTotal !== rowCountGas
                  ? ` of ${rowCountGasTotal}`
                  : ""}
                {viewType === "electricity_contract" &&
                showOnlyMismatchesElectricity &&
                rowCountContractTotal !== rowCountContract
                  ? ` of ${rowCountContractTotal}`
                  : ""}
                {viewType === "dma" &&
                showOnlyMismatchesDma &&
                rowCountDmaTotal !== rowCountDma
                  ? ` of ${rowCountDmaTotal}`
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
            rowCountGasTotal === 0 ? (
              <p className="text-sm text-gray-500 italic py-4">
                No C&I Gas discrepancy rows match the filters.
              </p>
            ) : rowCountGas === 0 ? (
              <p className="text-sm text-gray-500 italic py-4">
                No overcharged rows in the current filter set. Turn off &quot;Hide zero overcharge&quot; to see all rows.
              </p>
            ) : (
              <>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {rowCountGas} row(s). Red values indicate rate or overcharge differences. Expand a row for contract rates and take-or-pay detail.
                </p>
                <GasTable
                  rows={displayedGasRows}
                  expandedIds={expandedGasIds}
                  onToggleExpand={toggleGasExpand}
                />
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
            rowCountDmaTotal === 0 ? (
              <p className="text-sm text-gray-500 italic py-4">
                No DMA discrepancy rows match the filters.
              </p>
            ) : rowCountDma === 0 ? (
              <p className="text-sm text-gray-500 italic py-4">
                No mismatches in the current filter set. Turn off &quot;Show only mismatches&quot; to see all rows.
              </p>
            ) : (
              <>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {rowCountDma} row(s). Expand a row for DMA fees and the full status message.
                </p>
                <DmaTable
                  rows={displayedDmaRows}
                  expandedIds={expandedDmaIds}
                  onToggleExpand={toggleDmaExpand}
                />
              </>
            )
          ) : demandRowsLookUnmapped ? (
            <p className="text-sm text-gray-500 italic py-4">
              Demand Check rows were returned from the sheet but no column data could be read. Check that the &quot;Demand Check&quot; tab headers match the expected layout, or open the Google Sheet to verify.
            </p>
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


