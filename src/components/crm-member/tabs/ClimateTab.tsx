"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { PostureBadge, CollapsiblePanel } from "@/components/dashboard";
import { getApiBaseUrl } from "@/lib/utils";
import type { Client } from "../types";

function platformBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SUSTAINABILITY_PLATFORM_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "https://prograde-sustainability-dev-672026052958.australia-southeast2.run.app";
}

const ETL_UTILITY_TYPES = [
  "C&I Electricity",
  "SME Electricity",
  "C&I Gas",
  "SME Gas",
  "Waste",
  "Oil",
] as const;

type EtlUtilityType = (typeof ETL_UTILITY_TYPES)[number];

type DriftEvent = {
  event_id: string;
  event_type?: string | null;
  severity?: string | null;
  emitted_at?: string | null;
  affected_scope?: string | null;
  acknowledged?: boolean;
};

type ActivityRecordSummary = {
  record_id: string;
  site_id?: string | null;
  activity_type: string;
  quantity?: number | null;
  unit?: string | null;
  status: string;
  source_utility_type?: string | null;
  reporting_period?: { start?: string | null; end?: string | null };
};

type LinkedUtilitySite = {
  utilityType: EtlUtilityType;
  identifier: string;
  retailer: string;
};

type BackendLinkedUtilities = {
  effective_reporting_entity?: string | null;
  disclosure_source?: string | null;
  group_reporting_entity?: string | null;
  sites?: Array<{
    utility_type: string;
    identifier: string;
    retailer?: string;
  }>;
  site_count?: number;
};

type SiteInvoiceStats = {
  totalCount: number;
  loading: boolean;
  error?: string;
};

function siteKey(utilityType: string, identifier: string): string {
  return `${utilityType}|${identifier}`;
}

function toSafeIdentifier(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim() === "[object Object]" ? "" : v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object" && v !== null && "identifier" in v) {
    return toSafeIdentifier((v as { identifier: unknown }).identifier);
  }
  const s = String(v);
  return s === "[object Object]" ? "" : s;
}

function identifierFromUtilityObject(o: Record<string, unknown>): string {
  const direct = toSafeIdentifier(o.identifier);
  if (direct) return direct;
  for (const k of ["NMI", "nmi", "MRIN", "mrin", "Account Number", "Account Name", "Client Name"]) {
    if (k in o && o[k] != null) {
      const s = toSafeIdentifier(o[k]);
      if (s) return s;
    }
  }
  return "";
}

/** All linked identifiers per ETL utility type (not just the first). */
function parseAllLinkedUtilities(businessInfo: Record<string, unknown> | null): LinkedUtilitySite[] {
  const out: LinkedUtilitySite[] = [];
  if (!businessInfo) return out;

  const linked =
    ((businessInfo.Linked_Details as Record<string, unknown> | undefined)?.linked_utilities as
      | Record<string, unknown>
      | undefined) ?? {};
  const retailers =
    ((businessInfo.Linked_Details as Record<string, unknown> | undefined)?.utility_retailers as
      | Record<string, unknown>
      | undefined) ?? {};

  for (const utilityType of ETL_UTILITY_TYPES) {
    const raw = linked[utilityType];
    const retailerRaw = retailers[utilityType];
    let entries: Array<{ identifier: string; retailer: string }> = [];

    if (typeof raw === "string" && raw.trim()) {
      const ids = raw.split(",").map((v) => v.trim()).filter(Boolean);
      entries = ids.map((identifier, idx) => ({
        identifier,
        retailer: Array.isArray(retailerRaw)
          ? String(retailerRaw[idx] ?? "")
          : String(retailerRaw ?? ""),
      }));
    } else if (Array.isArray(raw) && raw.length > 0) {
      const first = raw[0];
      const firstIsObject = first != null && typeof first === "object" && !Array.isArray(first);
      if (firstIsObject) {
        entries = raw.map((item, idx) => {
          const o = item as Record<string, unknown>;
          const identifier = identifierFromUtilityObject(o) || toSafeIdentifier(o);
          const retailerFromObj = o.retailer != null ? String(o.retailer) : "";
          return {
            identifier,
            retailer:
              retailerFromObj ||
              (Array.isArray(retailerRaw) ? String(retailerRaw[idx] ?? "") : String(retailerRaw ?? "")),
          };
        });
      } else {
        entries = raw.map((item, idx) => ({
          identifier: toSafeIdentifier(item),
          retailer: Array.isArray(retailerRaw)
            ? String(retailerRaw[idx] ?? "")
            : String(retailerRaw ?? ""),
        }));
      }
    }

    for (const e of entries) {
      if (e.identifier) {
        out.push({ utilityType, identifier: e.identifier, retailer: e.retailer });
      }
    }
  }
  return out;
}

type EtlSyncResponse = {
  dry_run?: boolean;
  created?: number;
  updated?: number;
  skipped?: number;
  preview?: Array<{
    record_id?: string;
    activity_type?: string;
    quantity?: number;
    skipped?: boolean;
    reason?: string;
  }>;
  detail?: string;
};

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200",
  high: "bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-200",
  medium: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  low: "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-200",
  info: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

function severityClass(severity?: string | null): string {
  const key = (severity || "info").toLowerCase();
  return SEVERITY_STYLES[key] ?? SEVERITY_STYLES.info;
}

type ClimateTabProps = {
  client: Client;
  businessInfo?: Record<string, unknown> | null;
  onSaveReportingEntity: (reporting_entity: string) => Promise<void>;
  savingReportingEntity?: boolean;
};

export function ClimateTab({
  client,
  businessInfo = null,
  onSaveReportingEntity,
  savingReportingEntity = false,
}: ClimateTabProps) {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const token =
    (session as { id_token?: string; accessToken?: string })?.id_token ??
    (session as { id_token?: string; accessToken?: string })?.accessToken;

  const [backendLinked, setBackendLinked] = useState<BackendLinkedUtilities | null>(null);
  const [backendLinkedLoading, setBackendLinkedLoading] = useState(false);
  /** Bumped after a refresh so the embedded workspace reloads and recomputes. */
  const [workspaceNonce, setWorkspaceNonce] = useState(0);

  const memberSlug = (client.reporting_entity || "").trim();
  const effectiveEntity =
    (backendLinked?.effective_reporting_entity || memberSlug || "").trim();
  const disclosureSource = backendLinked?.disclosure_source;
  const period = "FY26";
  const disclosureHref = effectiveEntity
    ? `${platformBaseUrl()}/?entity=${encodeURIComponent(effectiveEntity)}&period=${encodeURIComponent(period)}`
    : null;
  // Cache-busted so a refresh remounts the workspace and it recomputes from the new staged rows.
  const iframeSrc = disclosureHref ? `${disclosureHref}&r=${workspaceNonce}` : null;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const platformOrigin = useMemo(() => {
    try {
      return new URL(platformBaseUrl()).origin;
    } catch {
      return "";
    }
  }, []);

  const linkedSitesFromBackend = useMemo((): LinkedUtilitySite[] => {
    const sites = backendLinked?.sites;
    if (!Array.isArray(sites) || sites.length === 0) return [];
    return sites
      .map((s) => ({
        utilityType: s.utility_type as EtlUtilityType,
        identifier: s.identifier,
        retailer: s.retailer ?? "",
      }))
      .filter((s) => ETL_UTILITY_TYPES.includes(s.utilityType) && s.identifier);
  }, [backendLinked?.sites]);

  const linkedSitesFromBusinessInfo = useMemo(
    () => parseAllLinkedUtilities(businessInfo),
    [businessInfo],
  );

  const linkedSites =
    linkedSitesFromBackend.length > 0 ? linkedSitesFromBackend : linkedSitesFromBusinessInfo;
  const utilityCountMismatch =
    backendLinked?.site_count != null &&
    linkedSitesFromBusinessInfo.length > 0 &&
    backendLinked.site_count !== linkedSitesFromBusinessInfo.length;

  const [driftEvents, setDriftEvents] = useState<DriftEvent[]>([]);
  const [driftLoading, setDriftLoading] = useState(false);
  const [activityRecords, setActivityRecords] = useState<ActivityRecordSummary[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const [invoiceStats, setInvoiceStats] = useState<Record<string, SiteInvoiceStats>>({});
  const [invoiceStatsLoading, setInvoiceStatsLoading] = useState(false);

  const [etlLoading, setEtlLoading] = useState(false);
  const [syncAllProgress, setSyncAllProgress] = useState<{ current: number; total: number; label: string } | null>(
    null,
  );
  const [reportingEntityDraft, setReportingEntityDraft] = useState("");

  useEffect(() => {
    setReportingEntityDraft(client.reporting_entity ?? "");
  }, [client.id, client.reporting_entity]);

  const fetchClimateData = useCallback(async () => {
    if (!client.id || !token) return;
    const base = getApiBaseUrl();
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    setDriftLoading(true);
    setRecordsLoading(true);
    try {
      const [driftRes, recordsRes] = await Promise.all([
        fetch(`${base}/api/clients/${client.id}/climate/drift-events`, { headers }),
        fetch(`${base}/api/clients/${client.id}/climate/activity-records?limit=200`, { headers }),
      ]);

      if (driftRes.ok) {
        const data = (await driftRes.json()) as { events?: DriftEvent[] };
        setDriftEvents(Array.isArray(data.events) ? data.events : []);
      } else {
        setDriftEvents([]);
      }

      if (recordsRes.ok) {
        const data = (await recordsRes.json()) as { records?: ActivityRecordSummary[] };
        setActivityRecords(Array.isArray(data.records) ? data.records : []);
      } else {
        setActivityRecords([]);
      }
    } catch {
      setDriftEvents([]);
      setActivityRecords([]);
    } finally {
      setDriftLoading(false);
      setRecordsLoading(false);
    }
  }, [client.id, token]);

  useEffect(() => {
    void fetchClimateData();
  }, [fetchClimateData]);

  useEffect(() => {
    if (!client.id || !token) {
      setBackendLinked(null);
      return;
    }
    let cancelled = false;
    setBackendLinkedLoading(true);
    void (async () => {
      try {
        const res = await fetch(
          `${getApiBaseUrl()}/api/clients/${client.id}/climate/linked-utilities`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) throw new Error("Failed to load linked utilities");
        const data = (await res.json()) as BackendLinkedUtilities;
        if (!cancelled) setBackendLinked(data);
      } catch {
        if (!cancelled) setBackendLinked(null);
      } finally {
        if (!cancelled) setBackendLinkedLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client.id, token]);

  const fetchInvoiceStats = useCallback(async () => {
    if (!token || linkedSites.length === 0) {
      setInvoiceStats({});
      return;
    }
    const base = getApiBaseUrl();
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    setInvoiceStatsLoading(true);
    const initial: Record<string, SiteInvoiceStats> = {};
    for (const site of linkedSites) {
      initial[siteKey(site.utilityType, site.identifier)] = { totalCount: 0, loading: true };
    }
    setInvoiceStats(initial);

    const batchSize = 4;
    for (let i = 0; i < linkedSites.length; i += batchSize) {
      const batch = linkedSites.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (site) => {
          const key = siteKey(site.utilityType, site.identifier);
          try {
            const res = await fetch(`${base}/api/utility-invoice-rows`, {
              method: "POST",
              headers,
              body: JSON.stringify({
                utility_type: site.utilityType,
                identifier: site.identifier,
                max_records: 1,
                offset: 0,
              }),
            });
            const data = (await res.json().catch(() => ({}))) as {
              total_count?: number;
              detail?: string;
            };
            if (!res.ok) {
              setInvoiceStats((prev) => ({
                ...prev,
                [key]: { totalCount: 0, loading: false, error: data.detail || `HTTP ${res.status}` },
              }));
              return;
            }
            setInvoiceStats((prev) => ({
              ...prev,
              [key]: { totalCount: data.total_count ?? 0, loading: false },
            }));
          } catch {
            setInvoiceStats((prev) => ({
              ...prev,
              [key]: { totalCount: 0, loading: false, error: "Request failed" },
            }));
          }
        }),
      );
    }
    setInvoiceStatsLoading(false);
  }, [token, linkedSites]);

  useEffect(() => {
    void fetchInvoiceStats();
  }, [fetchInvoiceStats]);

  const stagedCountBySite = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const rec of activityRecords) {
      const ut = rec.source_utility_type;
      const sid = rec.site_id;
      if (!ut || !sid) continue;
      const key = siteKey(ut, sid);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [activityRecords]);

  const postAuthToIframe = useCallback(() => {
    if (!token || !iframeRef.current?.contentWindow || !platformOrigin) return;
    iframeRef.current.contentWindow.postMessage(
      { type: "aces:auth", token },
      platformOrigin,
    );
  }, [token, platformOrigin]);

  useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      if (ev.origin !== platformOrigin) return;
      if (ev.data?.type === "aces:ready") postAuthToIframe();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [platformOrigin, postAuthToIframe]);

  const runEtlSyncForSite = useCallback(
    async (site: LinkedUtilitySite, dryRun: boolean): Promise<EtlSyncResponse & { ok: boolean }> => {
      if (!client.id || !token || !effectiveEntity) {
        return { ok: false, detail: "Missing client, token, or effective reporting entity" };
      }
      const res = await fetch(`${getApiBaseUrl()}/api/clients/${client.id}/climate/etl/sync`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          utility_type: site.utilityType,
          identifier: site.identifier.trim(),
          reporting_period_label: period,
          // Staging is no longer FY-scoped, so pull the site's full invoice history
          // in one go. 500 is the backend/Airtable ceiling; the response's
          // diagnostics.total_count reveals any truncation beyond that.
          max_records: 500,
          dry_run: dryRun,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as EtlSyncResponse & { detail?: string };
      return { ...data, ok: res.ok };
    },
    [client.id, token, effectiveEntity, period],
  );

  /**
   * Bring every linked site's invoice data into SQL staging, then bump the workspace
   * nonce so the embedded Prograde workspace reloads and recomputes.
   *
   * Phase 1 of ONE_CLICK_REFRESH_SPEC: this replaces the old manual
   * "Preview all" / "Sync all to SQL" / "Sync to SQL" buttons. Callers no longer
   * choose a site — every linked site is refreshed. Failures are reported by name
   * rather than as an anonymous count, so a partially staged entity is visible.
   */
  const refreshStagedData = useCallback(async (): Promise<boolean> => {
    if (!client.id || !token) {
      showToast("Sign in required", "error");
      return false;
    }
    if (!effectiveEntity) {
      showToast("Set a reporting entity (or a group disclosure slug) first", "error");
      return false;
    }
    if (linkedSites.length === 0) {
      showToast("No linked utilities on the LOA — link accounts in Airtable first", "warning");
      return false;
    }

    setEtlLoading(true);
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    const failed: string[] = [];

    try {
      for (let i = 0; i < linkedSites.length; i++) {
        const site = linkedSites[i];
        setSyncAllProgress({
          current: i + 1,
          total: linkedSites.length,
          label: `${site.utilityType} · ${site.identifier}`,
        });
        let data: (EtlSyncResponse & { ok: boolean }) | null = null;
        try {
          data = await runEtlSyncForSite(site, false);
        } catch {
          data = { ok: false, detail: "request failed" };
        }
        if (!data.ok) {
          failed.push(`${site.utilityType} ${site.identifier}${data.detail ? ` — ${data.detail}` : ""}`);
          continue;
        }
        totalCreated += data.created ?? 0;
        totalUpdated += data.updated ?? 0;
        totalSkipped += data.skipped ?? 0;
      }

      await fetchClimateData();
      setWorkspaceNonce((n) => n + 1);

      if (failed.length > 0) {
        showToast(
          `Refreshed with ${failed.length} failure(s): ${failed.slice(0, 3).join("; ")}` +
            (failed.length > 3 ? ` and ${failed.length - 3} more` : ""),
          "warning",
        );
        return false;
      }

      showToast(
        `Data refreshed: ${totalCreated} new, ${totalUpdated} updated` +
          (totalSkipped ? `, ${totalSkipped} skipped` : ""),
        "success",
      );
      return true;
    } catch {
      showToast("Refresh failed", "error");
      return false;
    } finally {
      setSyncAllProgress(null);
      setEtlLoading(false);
    }
  }, [
    client.id,
    token,
    effectiveEntity,
    linkedSites,
    runEtlSyncForSite,
    showToast,
    fetchClimateData,
  ]);

  /**
   * The single action the team uses: refresh the data, then open the workspace.
   * The workspace computes and commits on load, so no further clicks are needed.
   */
  const refreshAndOpenWorkspace = useCallback(async () => {
    if (!disclosureHref) {
      showToast("Set a reporting entity first", "error");
      return;
    }
    await refreshStagedData();
    window.open(disclosureHref, "_blank", "noopener,noreferrer");
  }, [disclosureHref, refreshStagedData, showToast]);

  const highestSeverity = driftEvents.reduce<string | null>((best, ev) => {
    const order = ["critical", "high", "medium", "low", "info"];
    const sev = (ev.severity || "info").toLowerCase();
    if (!best) return sev;
    return order.indexOf(sev) < order.indexOf(best) ? sev : best;
  }, null);

  return (
    <div className="space-y-4">
      <CollapsiblePanel
        title="Climate controls"
        description="Reporting entity, drift monitoring, linked utilities and the data brought in"
        defaultOpen
        badge={<PostureBadge variant="preview" />}
      >
        <div className="space-y-4">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-base">Sustainability reporting entity</CardTitle>
          <CardDescription>
            A1 entity slug for Prograde disclosures (e.g. parramatta-leagues-club). Required before sync and
            workspace — multiple members can share the same value.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <Input
              id="climate-reporting-entity"
              label="Entity ID"
              value={reportingEntityDraft}
              onChange={(e) => setReportingEntityDraft(e.target.value)}
              placeholder="e.g. parramatta-leagues-club"
              className="font-mono"
              wrapperClassName="min-w-[16rem] flex-1"
            />
            <Button
              variant="primary"
              size="sm"
              loading={savingReportingEntity}
              disabled={savingReportingEntity}
              onClick={() => void onSaveReportingEntity(reportingEntityDraft)}
            >
              Save
            </Button>
          </div>
          {effectiveEntity ? (
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              Effective disclosure slug: <span className="font-mono">{effectiveEntity}</span>
              {disclosureSource === "group_inherit" ? " (inherited from group)" : null}
              {disclosureSource === "member" && !memberSlug && backendLinked?.group_reporting_entity
                ? null
                : disclosureSource === "member" && memberSlug
                  ? " (site-level)"
                  : null}
            </p>
          ) : (
            <p className="text-xs text-amber-800 dark:text-amber-200">
              Save a site slug, or assign a group with a disclosure slug, to enable the workspace below.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              variant="primary"
              size="sm"
              loading={etlLoading}
              disabled={!effectiveEntity || etlLoading}
              onClick={() => void refreshAndOpenWorkspace()}
            >
              {etlLoading ? "Refreshing data…" : "Open Prograde workspace"}
            </Button>
            {syncAllProgress ? (
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Bringing in {syncAllProgress.current} of {syncAllProgress.total}: {syncAllProgress.label}
              </span>
            ) : (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Brings in the latest invoice data for every linked utility, then opens the workspace, which
                calculates the emissions on load.
              </span>
            )}
          </div>
          {backendLinkedLoading ? (
            <p className="text-xs text-gray-500">Loading linked utilities from LOA…</p>
          ) : null}
          {utilityCountMismatch ? (
            <p className="text-xs text-amber-800 dark:text-amber-200">
              Utility count from business info ({linkedSitesFromBusinessInfo.length}) differs from backend
              LOA resolver ({backendLinked?.site_count}) — using backend list for sync.
            </p>
          ) : null}
          {client.external_business_id && (
            <p className="text-xs text-gray-500">
              LOA record: <span className="font-mono">{client.external_business_id}</span>
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <PostureBadge variant="preview" />
        {driftLoading ? (
          <span className="text-xs text-gray-500">Checking drift events…</span>
        ) : driftEvents.length > 0 ? (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${severityClass(highestSeverity)}`}
          >
            Drift: {driftEvents.length} open
            {highestSeverity ? ` (${highestSeverity})` : ""}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
            No open drift events
          </span>
        )}
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Committed reports (B4) will show defensible when locked. WIP sheet is not source of truth.
        </span>
      </div>

      {driftEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Standards drift</CardTitle>
            <CardDescription>
              Prograde DRIFT_EVENT notifications for this reporting entity (unacknowledged).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {driftEvents.map((ev) => (
                <li key={ev.event_id} className="flex flex-wrap items-start gap-2 py-2 text-sm">
                  <span
                    className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${severityClass(ev.severity)}`}
                  >
                    {(ev.severity || "info").toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {(ev.event_type || "drift").replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-gray-500">
                      {ev.event_id}
                      {ev.emitted_at ? ` · ${ev.emitted_at.slice(0, 10)}` : ""}
                      {ev.affected_scope ? ` · scope: ${ev.affected_scope}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Linked utilities (LOA)</CardTitle>
            <CardDescription>
              Every site on the Airtable LOA. Compare <span className="font-medium">Airtable invoices</span>{" "}
              against <span className="font-medium">Brought in</span> — a gap means Open Prograde workspace
              hasn&apos;t been run since those invoices arrived.
            </CardDescription>
          </div>
          {linkedSites.length > 0 ? (
            <Button
              variant="secondary"
              size="sm"
              loading={etlLoading}
              disabled={!effectiveEntity || etlLoading}
              onClick={() => void refreshStagedData()}
            >
              Refresh data only
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-3">
          {syncAllProgress ? (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {syncAllProgress.current}/{syncAllProgress.total}: {syncAllProgress.label}
            </p>
          ) : null}
          {linkedSites.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No linked utilities in business info yet. Refresh business info on the Overview tab or link accounts on
              the LOA in Airtable.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-stroke dark:border-dark-3">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead className="bg-gray/50 text-xs uppercase text-gray-500 dark:bg-dark-3/50 dark:text-gray-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">Utility</th>
                    <th className="px-3 py-2 font-medium">Identifier</th>
                    <th className="px-3 py-2 font-medium">Retailer</th>
                    <th className="px-3 py-2 font-medium text-right">Airtable invoices</th>
                    <th className="px-3 py-2 font-medium text-right">Brought in</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {linkedSites.map((site) => {
                    const key = siteKey(site.utilityType, site.identifier);
                    const stats = invoiceStats[key];
                    const staged = stagedCountBySite[key] ?? 0;
                    const invoiceCount = stats?.totalCount;
                    return (
                      <tr key={key} className="text-gray-800 dark:text-gray-100">
                        <td className="px-3 py-2">{site.utilityType}</td>
                        <td className="px-3 py-2 font-mono text-xs">{site.identifier}</td>
                        <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                          {site.retailer || "—"}
                        </td>
                        <td className="px-3 py-2 text-right text-xs">
                          {stats?.loading || invoiceStatsLoading ? (
                            <span className="text-gray-500">…</span>
                          ) : stats?.error ? (
                            <span className="text-amber-700 dark:text-amber-300" title={stats.error}>
                              err
                            </span>
                          ) : (
                            <span>{invoiceCount ?? "—"}</span>
                          )}
                        </td>
                        <td
                          className={`px-3 py-2 text-right text-xs ${
                            staged === 0 && (invoiceCount ?? 0) > 0
                              ? "font-semibold text-amber-700 dark:text-amber-300"
                              : ""
                          }`}
                          title={
                            staged === 0 && (invoiceCount ?? 0) > 0
                              ? "Invoices exist but none have been brought in — run Open Prograde workspace"
                              : undefined
                          }
                        >
                          {staged > 0 ? staged : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity data brought in</CardTitle>
          <CardDescription>
            Invoice lines tidied into a consistent shape, ready for the emissions calculation. Read-only —
            refreshed by Open Prograde workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recordsLoading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : activityRecords.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Nothing brought in yet. Click <span className="font-medium">Open Prograde workspace</span> above.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 text-sm dark:divide-gray-800">
              {activityRecords.map((rec) => (
                <li key={rec.record_id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div>
                    <p className="font-medium">{rec.activity_type.replace(/_/g, " ")}</p>
                    <p className="font-mono text-xs text-gray-500">{rec.record_id}</p>
                  </div>
                  <div className="text-right text-xs text-gray-600 dark:text-gray-400">
                    {rec.quantity != null ? (
                      <span>
                        {rec.quantity.toLocaleString()} {rec.unit}
                      </span>
                    ) : (
                      <span>—</span>
                    )}
                    <br />
                    <span className="capitalize">{rec.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
        </div>
      </CollapsiblePanel>

      {iframeSrc ? (
        <Card className="overflow-hidden border-brand-disclosure/20 shadow-md">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0 border-b border-stroke bg-gradient-to-r from-brand-disclosure/5 to-transparent dark:border-dark-3">
            <div>
              <CardTitle className="text-base">Climate disclosure workspace</CardTitle>
              <CardDescription>
                Prograde preview for <span className="font-mono">{effectiveEntity}</span>
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <PostureBadge variant="preview" />
              {disclosureHref ? (
                <a
                  href={disclosureHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-full border border-stroke bg-white px-3 py-1.5 text-xs font-semibold text-dark transition-all hover:-translate-y-0.5 hover:shadow-sm dark:border-dark-3 dark:bg-gray-dark dark:text-white"
                >
                  Open full workspace
                </a>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="overflow-hidden p-0">
            <iframe
              ref={iframeRef}
              src={iframeSrc}
              title="Climate disclosure workspace"
              className="h-[min(75vh,800px)] w-full border-0"
              onLoad={postAuthToIframe}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Legacy GHG WIP</CardTitle>
          <CardDescription>
            Google Sheet via n8n — management preview only until B4 cutover (Phase 1 pilot).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href={`/ghg-reporting?business_name=${encodeURIComponent(client.business_name)}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            Open GHG Reporting →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
