"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { canAccessInvoicing } from "@/lib/invoicing-access";

type SheetEntry = {
  title: string;
  /** Short label used inside the tab pill (defaults to title if omitted) */
  shortLabel?: string;
  sheetIdOrUrl: string;
  /** Tabs as objects so we can deep-link to a specific gid */
  tabs: { name: string; gid?: string }[];
  /** Optional tag shown as a status badge in the toolbar */
  status?: "Recurring" | "Monthly" | "One-off" | "Active";
  notes?: string;
};

type SheetSection = {
  sectionTitle: string;
  /** Tailwind utility classes for accent color */
  accent: {
    dot: string; // section indicator dot
    activeBg: string; // active tab background
    activeText: string; // active tab text
    activeRing: string; // active tab ring
    chip: string; // tab chip background in toolbar
    chipText: string;
    chipActiveBg: string; // active tab-chip in info bar
    chipActiveText: string;
  };
  icon: string;
  items: SheetEntry[];
};

const SHEET_SECTIONS: SheetSection[] = [
  {
    sectionTitle: "Main",
    icon: "◆",
    accent: {
      dot: "bg-slate-700",
      activeBg: "bg-slate-700",
      activeText: "text-white",
      activeRing: "ring-slate-700/30",
      chip: "bg-slate-100 dark:bg-slate-900/40",
      chipText: "text-slate-700 dark:text-slate-300",
      chipActiveBg: "bg-slate-700",
      chipActiveText: "text-white",
    },
    items: [
      {
        title: "Bank Rec Doc",
        shortLabel: "Bank Rec",
        sheetIdOrUrl: "1ONg6g9kn-TmNaJ50yoX-oXu-2pJdW_qYibblv2pbQuU",
        status: "Active",
        tabs: [
          { name: "ForNRG - 10400759", gid: "0" },
          { name: "Environmental Global Benefits - 1057 8739", gid: "518622372" },
        ],
      },
    ],
  },
  {
    sectionTitle: "Direct Client Invoicing",
    icon: "▲",
    accent: {
      dot: "bg-emerald-600",
      activeBg: "bg-emerald-600",
      activeText: "text-white",
      activeRing: "ring-emerald-600/30",
      chip: "bg-emerald-50 dark:bg-emerald-950/30",
      chipText: "text-emerald-700 dark:text-emerald-300",
      chipActiveBg: "bg-emerald-600",
      chipActiveText: "text-white",
    },
    items: [
      {
        title: "Automation Services Invoicing",
        shortLabel: "Automation Services",
        sheetIdOrUrl: "1qycTrM4TnJRhaVTXc-cowQCCAujiGMlRknuWT1qgb-Y",
        status: "One-off",
        tabs: [
          { name: "One Off Invoicing", gid: "2013429471" },
          { name: "One Off Invoiced", gid: "501226163" },
          { name: "Recurring Invoicing", gid: "645819368" },
          { name: "Invoices Sent", gid: "1537028524" },
        ],
      },
      {
        title: "1 Month Savings Invoices - Members",
        shortLabel: "1 Month Savings",
        sheetIdOrUrl:
          "https://docs.google.com/spreadsheets/d/1uBv1L7pQmO5SJCE4jvPknBki1GsmnMFPVsNRShMl-7o/edit?gid=1015313886#gid=1015313886",
        status: "Active",
        tabs: [
          { name: "1st Month Savings Invoice", gid: "1015313886" },
          { name: "Outstanding" },
        ],
      },
      {
        title: "Equipment Rental Agreement Invoicing",
        shortLabel: "Equipment Rental",
        sheetIdOrUrl: "13g2tQQ1f65K3icPR1JNk5X1sfxSP5kbsJwSn-fGHtDo",
        status: "Monthly",
        tabs: [
          { name: "Client's To Invoice - Opex", gid: "2013429471" },
          { name: "Invoices Sent", gid: "1341033158" },
        ],
      },
      {
        title: "Solar Cleaning Invoicing",
        shortLabel: "Solar Cleaning",
        sheetIdOrUrl: "1WiLksDOwrQkEwVhF25F_RQ1G0zxF5VHiu9lAxQhQox4",
        status: "Active",
        tabs: [
          { name: "Dashboard Quotes Signed", gid: "760779528" },
          { name: "Invoices Sent", gid: "1341033158" },
          { name: "Dashboard Quotes Invoiced", gid: "347698556" },
        ],
      },
    ],
  },
  {
    sectionTitle: "Retailer Sheets",
    icon: "■",
    accent: {
      dot: "bg-indigo-600",
      activeBg: "bg-indigo-600",
      activeText: "text-white",
      activeRing: "ring-indigo-600/30",
      chip: "bg-indigo-50 dark:bg-indigo-950/30",
      chipText: "text-indigo-700 dark:text-indigo-300",
      chipActiveBg: "bg-indigo-600",
      chipActiveText: "text-white",
    },
    items: [
      {
        title: "ERA Invoicing",
        shortLabel: "ERA",
        sheetIdOrUrl: "16YuoSLf-uH_aUlLe1lnvqp1xTpMJlSMTGTO4ZG1FKPY",
        status: "Recurring",
        tabs: [
          { name: "Invoices Sent", gid: "1341033158" },
          { name: "Client's To Invoice", gid: "2013429471" },
        ],
      },
      {
        title: "Trojan Oil",
        sheetIdOrUrl: "1lFAUB1nl7yh2JkwgEI7Zd_lSDGusDtVnDIuZFPVmhdU",
        status: "Recurring",
        tabs: [
          { name: "Invoices Sent", gid: "1341033158" },
          { name: "All Data", gid: "2013429471" },
        ],
      },
      {
        title: "Origin Gas",
        sheetIdOrUrl:
          "https://docs.google.com/spreadsheets/d/13KUaL34dV8TCUtcExCZI9tC8yAb2XiYK3-MyVLglphE/edit",
        status: "Recurring",
        tabs: [
          { name: "Invoices Sent", gid: "204183407" },
          { name: "Commission Figures", gid: "1703322444" },
          { name: "Gas Commission Up to Date", gid: "0" },
          { name: "Already Invoiced", gid: "1411900023" },
        ],
      },
      {
        title: "Origin Electricity",
        shortLabel: "Origin Elec",
        sheetIdOrUrl:
          "https://docs.google.com/spreadsheets/d/1cqi0rFfcD8fLFehPIg6IDHJqwRL1AHR3b-_t2Gsyz7k/edit",
        status: "Recurring",
        tabs: [
          { name: "Invoices Sent", gid: "204183407" },
          { name: "Commission Figures", gid: "1703322444" },
          { name: "Commission Up to Date", gid: "0" },
          { name: "Already Invoiced", gid: "1411900023" },
        ],
      },
      {
        title: "Alinta Gas",
        sheetIdOrUrl:
          "https://docs.google.com/spreadsheets/d/16t1eFN8gIXr-EmcI08POzEMfCNwO3LazHYB2RSKDmk0/edit",
        status: "Recurring",
        tabs: [
          { name: "Invoices Sent", gid: "204183407" },
          { name: "Commission Figures", gid: "1703322444" },
          { name: "Gas Commission Up to Date", gid: "0" },
          { name: "Already Invoiced", gid: "1411900023" },
        ],
      },
    ],
  },
];

function extractSheetId(value: string): string {
  const raw = value.trim();
  const match = raw.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match?.[1]) return match[1];
  return raw;
}

function toSheetUrl(value: string, gid?: string): string {
  const base =
    value.startsWith("http://") || value.startsWith("https://")
      ? value.split("?")[0].split("#")[0]
      : `https://docs.google.com/spreadsheets/d/${extractSheetId(value)}/edit`;
  if (gid) return `${base}?gid=${gid}#gid=${gid}`;
  return base;
}

function toEmbedUrl(value: string, gid?: string): string {
  const id = extractSheetId(value);
  const base = `https://docs.google.com/spreadsheets/d/${id}/preview`;
  if (gid) return `${base}?gid=${gid}#gid=${gid}`;
  return base;
}

const STATUS_STYLES: Record<NonNullable<SheetEntry["status"]>, string> = {
  Recurring:
    "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900",
  Monthly:
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
  "One-off":
    "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900",
  Active:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
};

const PREVIEW_HEIGHTS = {
  compact: "h-[55vh]",
  comfortable: "h-[72vh]",
  tall: "h-[88vh]",
} as const;
type PreviewHeight = keyof typeof PREVIEW_HEIGHTS;

// --- Skeleton loader for the auth-loading state ---
function PageSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-20 rounded-xl bg-gray-100 dark:bg-dark-2" />
      <div className="h-12 rounded-xl bg-gray-100 dark:bg-dark-2" />
      <div className="h-[72vh] rounded-xl bg-gray-100 dark:bg-dark-2" />
    </div>
  );
}

export default function RobotDashboardInvoicingPage() {
  const { data: session, status } = useSession();
  const email = session?.user?.email ?? null;
  const isAllowed = canAccessInvoicing(email);

  // Flatten while keeping a back-reference to each sheet's section
  const allSheets = useMemo(
    () =>
      SHEET_SECTIONS.flatMap((section) =>
        section.items.map((item) => ({ section, item }))
      ),
    []
  );

  const totalTabs = useMemo(
    () => allSheets.reduce((acc, s) => acc + s.item.tabs.length, 0),
    [allSheets]
  );

  const firstKey = allSheets[0]
    ? `${allSheets[0].section.sectionTitle}::${allSheets[0].item.title}`
    : "";

  const [selectedKey, setSelectedKey] = useState<string>(firstKey);
  const [previewHeight, setPreviewHeight] = useState<PreviewHeight>("comfortable");
  /** gid currently shown in the iframe — null means show first tab / no override */
  const [activeTabGid, setActiveTabGid] = useState<string | null>(null);

  const selected = useMemo(
    () =>
      allSheets.find(
        (s) => `${s.section.sectionTitle}::${s.item.title}` === selectedKey
      ) ?? allSheets[0],
    [allSheets, selectedKey]
  );

  // Pick which gid to show: the user's clicked one, or the first tab's gid as default
  const effectiveGid =
    activeTabGid ?? selected?.item.tabs.find((t) => t.gid)?.gid ?? undefined;

  const previewUrl = selected
    ? toEmbedUrl(selected.item.sheetIdOrUrl, effectiveGid)
    : "";
  const openUrl = selected
    ? toSheetUrl(selected.item.sheetIdOrUrl, effectiveGid)
    : "";

  // When switching sheets, reset the active tab so the new sheet opens to its first tab
  function selectSheet(key: string) {
    setSelectedKey(key);
    setActiveTabGid(null);
  }

  if (status === "loading") {
    return <PageSkeleton />;
  }

  if (!isAllowed) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>
            You do not have permission to access Invoicing.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* ---------- Header / summary strip ---------- */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-xl">Invoicing</CardTitle>
              <CardDescription>
                Central view for all invoicing Google Sheets.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SummaryStat label="Sheets" value={allSheets.length} />
              <SummaryStat label="Categories" value={SHEET_SECTIONS.length} />
              <SummaryStat label="Tabs tracked" value={totalTabs} />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* ---------- Tab bar (sheet selector) ---------- */}
      <Card variant="elevated">
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            {SHEET_SECTIONS.map((section, sIdx) => (
              <div
                key={section.sectionTitle}
                className="flex items-center gap-2"
              >
                {/* Section divider (skip before first) */}
                {sIdx > 0 ? (
                  <span
                    className="hidden h-6 w-px bg-stroke dark:bg-dark-3 lg:inline-block"
                    aria-hidden
                  />
                ) : null}

                {/* Section label */}
                <div className="flex items-center gap-1.5 pr-1">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${section.accent.dot}`}
                  />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {section.sectionTitle}
                  </span>
                </div>

                {/* Tabs in this section */}
                <div className="flex flex-wrap gap-1.5">
                  {section.items.map((sheet) => {
                    const key = `${section.sectionTitle}::${sheet.title}`;
                    const isActive = key === selectedKey;
                    const label = sheet.shortLabel ?? sheet.title;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => selectSheet(key)}
                        title={sheet.title}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                          isActive
                            ? `${section.accent.activeBg} ${section.accent.activeText} ring-2 ring-offset-1 dark:ring-offset-dark ${section.accent.activeRing} shadow-sm`
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark-2 dark:text-gray-300 dark:hover:bg-dark-3"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ---------- Active sheet info bar ---------- */}
      {selected ? (
        <Card variant="elevated">
          <CardContent className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-bold text-dark dark:text-white">
                    {selected.item.title}
                  </h2>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {selected.section.icon} {selected.section.sectionTitle}
                  </p>
                </div>

                {selected.item.status ? (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${STATUS_STYLES[selected.item.status]}`}
                  >
                    {selected.item.status}
                  </span>
                ) : null}

                {/* Inline tab switchers — these now swap the iframe rather than open new windows */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Tabs:
                  </span>
                  {selected.item.tabs.map((tab) => {
                    const isActiveTab =
                      tab.gid !== undefined && tab.gid === effectiveGid;
                    const hasGid = !!tab.gid;
                    return (
                      <button
                        key={`${selected.item.title}-${tab.name}`}
                        type="button"
                        onClick={() => {
                          if (hasGid) setActiveTabGid(tab.gid!);
                        }}
                        disabled={!hasGid}
                        title={
                          hasGid
                            ? `Switch preview to: ${tab.name}`
                            : `${tab.name} (no gid configured)`
                        }
                        className={`rounded-md px-2 py-0.5 text-[11px] transition-colors ${
                          isActiveTab
                            ? `${selected.section.accent.chipActiveBg} ${selected.section.accent.chipActiveText} font-semibold shadow-sm`
                            : `${selected.section.accent.chip} ${selected.section.accent.chipText} hover:underline`
                        } ${!hasGid ? "cursor-not-allowed opacity-50" : ""}`}
                      >
                        {tab.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Height toggle */}
                <div className="flex items-center rounded-lg border border-stroke bg-white p-0.5 text-[11px] dark:border-dark-3 dark:bg-dark-2">
                  {(Object.keys(PREVIEW_HEIGHTS) as PreviewHeight[]).map(
                    (h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setPreviewHeight(h)}
                        className={`rounded-md px-2 py-1 font-medium capitalize transition-colors ${
                          previewHeight === h
                            ? "bg-indigo-600 text-white"
                            : "text-gray-600 hover:text-dark dark:text-gray-400 dark:hover:text-white"
                        }`}
                        title={`${h} height`}
                      >
                        {h}
                      </button>
                    )
                  )}
                </div>

                <a
                  href={openUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
                >
                  Open full sheet ↗
                </a>
              </div>
            </div>

            {selected.item.notes ? (
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                {selected.item.notes}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* ---------- Full-width preview ---------- */}
      <Card variant="elevated">
        <CardContent>
          {previewUrl ? (
            <iframe
              key={previewUrl}
              src={previewUrl}
              title={`Sheet preview: ${selected?.item.title ?? ""}`}
              className={`w-full rounded-xl border border-stroke dark:border-dark-3 ${PREVIEW_HEIGHTS[previewHeight]}`}
            />
          ) : (
            <div
              className={`flex items-center justify-center rounded-xl border border-dashed border-stroke dark:border-dark-3 ${PREVIEW_HEIGHTS[previewHeight]}`}
            >
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No sheet selected for preview.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// --- Small helpers ---

function SummaryStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-baseline gap-1.5 rounded-lg border border-stroke bg-white px-3 py-1.5 dark:border-dark-3 dark:bg-dark-2">
      <span className="text-sm font-bold text-dark dark:text-white">{value}</span>
      <span className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </span>
    </div>
  );
}