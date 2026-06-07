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

/** First linked identifier per utility type (for ETL form defaults). */
function linkedUtilityIdentifiers(sites: LinkedUtilitySite[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const site of sites) {
    if (!out[site.utilityType]) out[site.utilityType] = site.identifier;
  }
  return out;
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

  const entity = (client.reporting_entity || "").trim();
  const period = "FY26";
  const iframeSrc = entity
    ? `${platformBaseUrl()}/?entity=${encodeURIComponent(entity)}&period=${encodeURIComponent(period)}`
    : null;
  const disclosureHref = iframeSrc;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const platformOrigin = useMemo(() => {
    try {
      return new URL(platformBaseUrl()).origin;
    } catch {
      return "";
    }
  }, []);

  const linkedSites = useMemo(() => parseAllLinkedUtilities(businessInfo), [businessInfo]);
  const linkedIds = useMemo(() => linkedUtilityIdentifiers(linkedSites), [linkedSites]);

  const [driftEvents, setDriftEvents] = useState<DriftEvent[]>([]);
  const [driftLoading, setDriftLoading] = useState(false);
  const [activityRecords, setActivityRecords] = useState<ActivityRecordSummary[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const [invoiceStats, setInvoiceStats] = useState<Record<string, SiteInvoiceStats>>({});
  const [invoiceStatsLoading, setInvoiceStatsLoading] = useState(false);

  const [utilityType, setUtilityType] = useState<EtlUtilityType>("C&I Electricity");
  const [identifier, setIdentifier] = useState("");
  const [etlLoading, setEtlLoading] = useState(false);
  const [syncAllProgress, setSyncAllProgress] = useState<{ current: number; total: number; label: string } | null>(
    null,
  );
  const [lastEtlPreview, setLastEtlPreview] = useState<EtlSyncResponse | null>(null);
  const [reportingEntityDraft, setReportingEntityDraft] = useState("");

  useEffect(() => {
    setReportingEntityDraft(client.reporting_entity ?? "");
  }, [client.id, client.reporting_entity]);

  useEffect(() => {
    const suggested = linkedIds[utilityType];
    if (suggested && !identifier) {
      setIdentifier(suggested);
    }
  }, [utilityType, linkedIds, identifier]);

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

  const runEtlSync = useCallback(
    async (dryRun: boolean) => {
      if (!client.id || !token) {
        showToast("Sign in required", "error");
        return;
      }
      if (!entity) {
        showToast("Set sustainability reporting entity below first", "error");
        return;
      }
      const idTrim = identifier.trim();
      if (!idTrim) {
        showToast("Enter a utility identifier (NMI, MRIN, etc.)", "error");
        return;
      }

      setEtlLoading(true);
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/clients/${client.id}/climate/etl/sync`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            utility_type: utilityType,
            identifier: idTrim,
            reporting_period_label: period,
            max_records: 100,
            dry_run: dryRun,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as EtlSyncResponse & { detail?: string };
        if (!res.ok) {
          showToast(data.detail || `ETL failed (${res.status})`, "error");
          return;
        }
        setLastEtlPreview(data);
        if (dryRun) {
          const produced = (data.preview ?? []).filter((p) => !p.skipped).length;
          showToast(
            `Preview: ${produced} record(s), ${data.skipped ?? 0} skipped`,
            produced > 0 ? "success" : "warning",
          );
        } else {
          showToast(
            `Synced: ${data.created ?? 0} created, ${data.updated ?? 0} updated, ${data.skipped ?? 0} skipped`,
            "success",
          );
          await fetchClimateData();
        }
      } catch {
        showToast("ETL request failed", "error");
      } finally {
        setEtlLoading(false);
      }
    },
    [client.id, token, entity, identifier, utilityType, period, showToast, fetchClimateData],
  );

  const runEtlSyncForSite = useCallback(
    async (site: LinkedUtilitySite, dryRun: boolean): Promise<EtlSyncResponse & { ok: boolean }> => {
      if (!client.id || !token || !entity) {
        return { ok: false, detail: "Missing client, token, or reporting entity" };
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
          max_records: 100,
          dry_run: dryRun,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as EtlSyncResponse & { detail?: string };
      return { ...data, ok: res.ok };
    },
    [client.id, token, entity, period],
  );

  const runSyncAll = useCallback(
    async (dryRun: boolean) => {
      if (!client.id || !token) {
        showToast("Sign in required", "error");
        return;
      }
      if (!entity) {
        showToast("Set sustainability reporting entity below first", "error");
        return;
      }
      if (linkedSites.length === 0) {
        showToast("No linked utilities on LOA — check business info", "warning");
        return;
      }

      setEtlLoading(true);
      let totalCreated = 0;
      let totalUpdated = 0;
      let totalSkipped = 0;
      let failures = 0;

      try {
        for (let i = 0; i < linkedSites.length; i++) {
          const site = linkedSites[i];
          setSyncAllProgress({
            current: i + 1,
            total: linkedSites.length,
            label: `${site.utilityType} · ${site.identifier}`,
          });
          const data = await runEtlSyncForSite(site, dryRun);
          if (!data.ok) {
            failures += 1;
            continue;
          }
          totalCreated += data.created ?? 0;
          totalUpdated += data.updated ?? 0;
          totalSkipped += data.skipped ?? 0;
        }

        if (dryRun) {
          showToast(
            `Preview all: ${linkedSites.length - failures} site(s) ok, ${failures} failed · ${totalSkipped} row(s) skipped`,
            failures > 0 ? "warning" : "success",
          );
        } else {
          showToast(
            `Sync all: ${totalCreated} created, ${totalUpdated} updated, ${totalSkipped} skipped` +
              (failures ? ` · ${failures} site(s) failed` : ""),
            failures > 0 ? "warning" : "success",
          );
          await fetchClimateData();
        }
      } catch {
        showToast("Batch sync failed", "error");
      } finally {
        setSyncAllProgress(null);
        setEtlLoading(false);
      }
    },
    [client.id, token, entity, linkedSites, runEtlSyncForSite, showToast, fetchClimateData],
  );

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
        description="Entity setup, drift monitoring, ETL sync, and staged records"
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
          {entity ? (
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              Active slug: <span className="font-mono">{entity}</span>
              {disclosureHref ? (
                <>
                  {" "}
                  ·{" "}
                  <Link href={disclosureHref} target="_blank" rel="noopener noreferrer" className="underline">
                    Open Prograde workspace
                  </Link>
                </>
              ) : null}
            </p>
          ) : (
            <p className="text-xs text-amber-800 dark:text-amber-200">
              Save an entity slug to enable linked utilities sync and the disclosure workspace below.
            </p>
          )}
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
              All sites from Airtable LOA linked fields — invoice rows in Airtable and staged activity in SQL.
            </CardDescription>
          </div>
          {linkedSites.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                loading={etlLoading}
                disabled={!entity || etlLoading}
                onClick={() => void runSyncAll(true)}
              >
                Preview all
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={etlLoading}
                disabled={!entity || etlLoading}
                onClick={() => void runSyncAll(false)}
              >
                Sync all to SQL
              </Button>
            </div>
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
                    <th className="px-3 py-2 font-medium text-right">Staged</th>
                    <th className="px-3 py-2 font-medium text-right">Actions</th>
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
                        <td className="px-3 py-2 text-right text-xs">{staged > 0 ? staged : "—"}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                            disabled={etlLoading}
                            onClick={() => {
                              setUtilityType(site.utilityType);
                              setIdentifier(site.identifier);
                            }}
                          >
                            Use in form
                          </button>
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
          <CardTitle className="text-base">Sync from Airtable</CardTitle>
          <CardDescription>
            Pull invoice rows into <span className="font-mono">climate_activity_records</span> (SQL staging).
            Preview first, then sync. Requires reporting entity + Airtable direct mode on backend.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-gray-600 dark:text-gray-400">Utility type</span>
              <select
                className="w-full rounded-md border border-stroke bg-white px-3 py-2 text-sm dark:border-dark-3 dark:bg-gray-dark"
                value={utilityType}
                onChange={(e) => {
                  const next = e.target.value as EtlUtilityType;
                  setUtilityType(next);
                  const suggested = linkedIds[next];
                  if (suggested) setIdentifier(suggested);
                }}
                disabled={etlLoading}
              >
                {ETL_UTILITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-gray-600 dark:text-gray-400">Identifier (NMI / MRIN / account)</span>
              <input
                type="text"
                className="w-full rounded-md border border-stroke bg-white px-3 py-2 font-mono text-sm dark:border-dark-3 dark:bg-gray-dark"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={utilityType.includes("Electricity") ? "NMI" : "MRIN or account"}
                disabled={etlLoading}
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              loading={etlLoading}
              disabled={!entity || etlLoading}
              onClick={() => void runEtlSync(true)}
            >
              Preview (dry run)
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={etlLoading}
              disabled={!entity || etlLoading}
              onClick={() => void runEtlSync(false)}
            >
              Sync to SQL
            </Button>
          </div>
          {lastEtlPreview?.preview && lastEtlPreview.preview.length > 0 && (
            <div className="rounded-md border border-stroke bg-gray/30 p-3 text-xs dark:border-dark-3 dark:bg-dark-3/30">
              <p className="mb-2 font-medium text-gray-700 dark:text-gray-300">Last preview</p>
              <ul className="max-h-32 space-y-1 overflow-y-auto font-mono text-gray-600 dark:text-gray-400">
                {lastEtlPreview.preview.slice(0, 8).map((row, i) => (
                  <li key={i}>
                    {row.skipped
                      ? `skip ${row.reason ?? "unknown"}`
                      : `${row.activity_type} · ${row.quantity ?? "—"} (${row.record_id})`}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Staged activity records</CardTitle>
          <CardDescription>
            B4-boundary rows staged before Prograde ingest (post-Tuesday).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recordsLoading ? (
            <p className="text-sm text-gray-500">Loading staged records…</p>
          ) : activityRecords.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No staged records yet. Use Sync from Airtable above.
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
                Prograde preview for <span className="font-mono">{entity}</span>
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
