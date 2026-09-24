"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  GCI_OUTBOUND_SEQUENCE,
  isComparisonLinkedTemplate,
} from "@/lib/autonomous-sequence-keys";
import {
  archiveCampaign,
  archiveCampaigns,
  CampaignDeleteError,
  createCampaign,
  deleteCampaign,
  deleteSuppression,
  getCampaign,
  listCampaigns,
  listSequenceTypes,
  listSuppressions,
  patchCampaign,
  pauseCampaign,
  resumeCampaign,
  saveCampaignRows,
  sendCampaignTest,
  sendCampaignNextN,
  previewCampaignRows,
  setCampaignRowHumanOnly,
  startCampaign,
  unarchiveCampaign,
  applyPendingHumanOnly,
  countsFromCampaignRows,
  recipientFlagKey,
  MidSendEditError,
  type CampaignDeleteBlocked,
  type CampaignMidSendEdit,
  type CampaignRowPayload,
  type CampaignSequenceOption,
  type CampaignShapeWarning,
  type CampaignStatus,
  type CampaignSummary,
  type SuppressionRow,
} from "@/lib/campaign-api";
import { renderTemplate } from "@/lib/merge-template";
import { formatScheduleZone } from "@/lib/schedule-tz";

type Props = {
  token: string | undefined;
  userEmail: string;
  headers: string[];
  rawRows: string[][];
  columnMap: Record<string, string>;
  subject: string;
  body: string;
  setSubject: (value: string) => void;
  setBody: (value: string) => void;
  setColumnMap: (value: Record<string, string>) => void;
  currentMergeRow: Record<string, string>;
  currentLabel: string;
  currentSourceIndex: number | null;
  parsed: boolean;
  children: ReactNode;
};

export type CampaignRowFilter = "rows" | "distinct" | "sendable" | "human_only" | "warnings";

function csvFingerprint(
  headersList: string[],
  rows: string[][],
  map: Record<string, string>,
) {
  const keys = Object.keys(map).sort();
  const columnMap = Object.fromEntries(keys.map((key) => [key, map[key]]));
  return JSON.stringify({ headers: headersList, rows, columnMap });
}

type CampaignCtx = {
  token: string | undefined;
  selectedId: number | "new";
  name: string;
  setName: (value: string) => void;
  sequenceType: string;
  setSequenceType: (value: string) => void;
  status: CampaignStatus;
  provenance: string;
  setProvenance: (value: string) => void;
  dailyCap: string;
  setDailyCap: (value: string) => void;
  sendWindowStart: string;
  setSendWindowStart: (value: string) => void;
  sendWindowEnd: string;
  setSendWindowEnd: (value: string) => void;
  sendNextN: string;
  setSendNextN: (value: string) => void;
  testTo: string;
  setTestTo: (value: string) => void;
  busy: string | null;
  message: string | null;
  error: string | null;
  dismissError: () => void;
  rowCounts: CampaignSummary["row_counts"] | null;
  summaryIsPreview: boolean;
  shapeWarnings: CampaignShapeWarning[];
  serverRows: CampaignRowPayload[];
  rowFilter: CampaignRowFilter;
  setRowFilter: (value: CampaignRowFilter) => void;
  warningsAcknowledged: boolean;
  setWarningsAcknowledged: (value: boolean) => void;
  onSetHumanOnly: (rowId: number, human_only: boolean, reason?: string) => Promise<void>;
  canFlagHumanOnly: boolean;
  campaignId: number | null;
  campaigns: CampaignSummary[];
  archived: boolean;
  listTab: "running" | "finished";
  setListTab: (value: "running" | "finished") => void;
  showArchived: boolean;
  setShowArchived: (value: boolean) => void;
  selectedIds: number[];
  onToggleSelected: (id: number, checked: boolean) => void;
  onToggleSelectedAll: (checked: boolean) => void;
  onArchiveSelected: () => Promise<void>;
  onArchive: (id?: number) => Promise<void>;
  onUnarchive: (id?: number) => Promise<void>;
  onDelete: (id?: number) => Promise<void>;
  onConfirmDelete: () => Promise<void>;
  onCancelDelete: () => void;
  deleteTargetId: number | null;
  deleteBlock: CampaignDeleteBlocked | null;
  dropdownTypes: CampaignSequenceOption[];
  comparisonSelected: boolean;
  readOnly: boolean;
  contentEditable: boolean;
  throttleEditable: boolean;
  resolvedSubject: string;
  currentLabel: string;
  onSelectCampaign: (value: string) => void;
  onSave: () => Promise<void>;
  midSendConfirm: { already_sent: number; will_get_new: number } | null;
  onConfirmMidSendEdit: () => Promise<void>;
  onCancelMidSendEdit: () => void;
  scheduleTimezone: string;
  midSendEdits: CampaignMidSendEdit[];
  onSaveThrottle: () => Promise<void>;
  onTestSend: () => Promise<void>;
  onReady: () => Promise<void>;
  onStart: () => Promise<void>;
  onSendNext: () => Promise<void>;
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
  suppressions: SuppressionRow[];
  suppressionsError: string | null;
  onDeleteSuppression: (id: number) => Promise<void>;
};

const Ctx = createContext<CampaignCtx | null>(null);

export function useCampaign() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("Campaign controls must wrap the campaigns page");
  return ctx;
}

function pickDefaultSequence(items: CampaignSequenceOption[]): string {
  const gci = items.find((t) => t.sequence_type === GCI_OUTBOUND_SEQUENCE);
  return (gci ?? items[0])?.sequence_type ?? "";
}

export function CampaignWorkspace({
  token,
  userEmail,
  headers,
  rawRows,
  columnMap,
  subject,
  body,
  setSubject,
  setBody,
  setColumnMap,
  currentMergeRow,
  currentLabel,
  currentSourceIndex,
  parsed,
  children,
}: Props) {
  const { showToast } = useToast();
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [types, setTypes] = useState<CampaignSequenceOption[]>([]);
  const [selectedId, setSelectedId] = useState<number | "new">("new");
  const [name, setName] = useState("GCI 2027-29");
  const [sequenceType, setSequenceType] = useState("");
  const [status, setStatus] = useState<CampaignStatus>("draft");
  const [provenance, setProvenance] = useState("");
  const [dailyCap, setDailyCap] = useState("25");
  const [sendWindowStart, setSendWindowStart] = useState("09:00");
  const [sendWindowEnd, setSendWindowEnd] = useState("17:00");
  const [sendNextN, setSendNextN] = useState("10");
  const [testTo, setTestTo] = useState(userEmail);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rowCounts, setRowCounts] = useState<CampaignSummary["row_counts"] | null>(null);
  const [summaryIsPreview, setSummaryIsPreview] = useState(false);
  const [shapeWarnings, setShapeWarnings] = useState<CampaignShapeWarning[]>([]);
  const [campaignId, setCampaignId] = useState<number | null>(null);
  const [serverRows, setServerRows] = useState<CampaignRowPayload[]>([]);
  const [rowFilter, setRowFilter] = useState<CampaignRowFilter>("rows");
  const [warningsAcknowledged, setWarningsAcknowledged] = useState(false);
  const [suppressions, setSuppressions] = useState<SuppressionRow[]>([]);
  const [suppressionsError, setSuppressionsError] = useState<string | null>(null);
  const [archived, setArchived] = useState(false);
  const [listTab, setListTab] = useState<"running" | "finished">("running");
  const [showArchived, setShowArchived] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleteBlock, setDeleteBlock] = useState<CampaignDeleteBlocked | null>(null);
  const persistedCsv = useRef<string | null>(null);
  const [pendingHumanOnly, setPendingHumanOnly] = useState<
    Record<string, { human_only: boolean; reason?: string }>
  >({});
  const [midSendConfirm, setMidSendConfirm] = useState<{
    already_sent: number;
    will_get_new: number;
  } | null>(null);
  const [scheduleTimezone, setScheduleTimezone] = useState("Australia/Brisbane");
  const [midSendEdits, setMidSendEdits] = useState<CampaignMidSendEdit[]>([]);

  const readOnly = status !== "draft";
  const contentEditable = status !== "done" && !archived;
  const throttleEditable = status !== "done" && !archived;
  const canFlagHumanOnly = status !== "done" && !archived;
  const resolvedSubject = renderTemplate(subject, currentMergeRow).output;

  const fail = useCallback(
    (text: string) => {
      setMessage(null);
      setError(text);
      showToast(text, "error");
    },
    [showToast],
  );

  const ok = useCallback(
    (text: string) => {
      setError(null);
      setMessage(text);
      showToast(text, "success");
    },
    [showToast],
  );

  useEffect(() => {
    setTestTo((prev) => prev || userEmail);
  }, [userEmail]);

  const refreshList = useCallback(async () => {
    if (!token) return;
    const items = await listCampaigns(token, true);
    setCampaigns(items);
    const valid = new Set(items.map((item) => item.id));
    setSelectedIds((prev) => prev.filter((id) => valid.has(id)));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void refreshList().catch((e) => fail(e instanceof Error ? e.message : "Could not list campaigns"));
  }, [token, fail, refreshList]);

  useEffect(() => {
    if (!token) return;
    void listSequenceTypes(token)
      .then((items) => {
        const outbound = items.filter((t) => t.is_active && !isComparisonLinkedTemplate(t));
        setTypes(items);
        setSequenceType((current) => current || pickDefaultSequence(outbound));
      })
      .catch((e) => fail(e instanceof Error ? e.message : "Could not load sequences"));
    void listSuppressions(token)
      .then((rows) => {
        setSuppressions(rows);
        setSuppressionsError(null);
      })
      .catch((e) => setSuppressionsError(e instanceof Error ? e.message : "Could not load suppressions"));
  }, [token, fail]);

  useEffect(() => {
    setWarningsAcknowledged(false);
  }, [campaignId, rowCounts?.warnings]);

  useEffect(() => {
    if (!token || !parsed || status !== "draft") return;
    const fingerprint = csvFingerprint(headers, rawRows, columnMap);
    if (campaignId != null && persistedCsv.current === fingerprint) return;
    let cancelled = false;
    const handle = window.setTimeout(() => {
      void previewCampaignRows(token, headers, rawRows, columnMap)
        .then((summary) => {
          if (cancelled) return;
          setRowCounts({
            rows: summary.rows,
            unique_recipients: summary.unique_recipients,
            pending: summary.pending ?? 0,
            sendable: summary.sendable ?? 0,
            human_only: summary.human_only ?? 0,
            warnings: summary.warnings ?? 0,
            test_sends: 0,
          });
          setShapeWarnings(summary.shape_warnings ?? []);
          setSummaryIsPreview(true);
          setServerRows(
            (summary.preview_rows ?? []).map((row) => ({
              ...row,
              shape_warnings: row.shape_warnings || [],
              human_only_reason: row.human_only_reason ?? null,
            })),
          );
        })
        .catch((e) => {
          if (!cancelled) fail(e instanceof Error ? e.message : "Could not preview the list");
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [token, parsed, headers, rawRows, columnMap, status, campaignId, fail]);

  const outboundTypes = useMemo(
    () => types.filter((t) => t.is_active && !isComparisonLinkedTemplate(t)),
    [types],
  );

  const dropdownTypes = useMemo(() => {
    const selected = types.find((t) => t.sequence_type === sequenceType);
    if (selected && isComparisonLinkedTemplate(selected)) {
      return [selected, ...outboundTypes.filter((t) => t.sequence_type !== selected.sequence_type)];
    }
    return outboundTypes;
  }, [types, outboundTypes, sequenceType]);

  const comparisonSelected = useMemo(() => {
    const selected = types.find((t) => t.sequence_type === sequenceType);
    return Boolean(selected && isComparisonLinkedTemplate(selected));
  }, [types, sequenceType]);

  function applyCampaign(campaign: CampaignSummary) {
    setCampaignId(campaign.id);
    setSelectedId(campaign.id);
    setName(campaign.name);
    setSequenceType(campaign.sequence_type);
    setStatus(campaign.status);
    setSubject(campaign.first_touch_subject || subject);
    setBody(campaign.first_touch_html || body);
    setProvenance(campaign.provenance_note || "");
    setDailyCap(campaign.daily_cap != null ? String(campaign.daily_cap) : "");
    setSendWindowStart(campaign.send_window_start || "09:00");
    setSendWindowEnd(campaign.send_window_end || "17:00");
    setColumnMap(campaign.merge_field_map || {});
    setRowCounts({
      rows: campaign.row_counts?.rows ?? 0,
      unique_recipients: campaign.row_counts?.unique_recipients ?? 0,
      pending: campaign.row_counts?.pending ?? 0,
      sendable: campaign.row_counts?.sendable ?? 0,
      human_only: campaign.row_counts?.human_only ?? 0,
      warnings: campaign.row_counts?.warnings ?? 0,
      test_sends: campaign.row_counts?.test_sends ?? 0,
    });
    setShapeWarnings(campaign.shape_warnings ?? []);
    setSummaryIsPreview(false);
    persistedCsv.current = csvFingerprint(headers, rawRows, campaign.merge_field_map || {});
    setArchived(Boolean(campaign.archived));
    setScheduleTimezone(campaign.schedule_timezone || "Australia/Brisbane");
    setMidSendEdits(campaign.mid_send_edits ?? []);
    setPendingHumanOnly({});
    setServerRows(
      (campaign.rows ?? []).map((row) => ({
        ...row,
        shape_warnings: row.shape_warnings || [],
        human_only_reason: row.human_only_reason ?? null,
      })),
    );
  }

  async function loadCampaign(id: number) {
    if (!token) return;
    setBusy("load");
    setError(null);
    try {
      applyCampaign(await getCampaign(token, id));
    } catch (e) {
      fail(e instanceof Error ? e.message : "Could not load that campaign");
    } finally {
      setBusy(null);
    }
  }

  function resetToNew() {
    setSelectedId("new");
    setCampaignId(null);
    setStatus("draft");
    setArchived(false);
    setDeleteBlock(null);
    setDeleteTargetId(null);
    setRowCounts(null);
    setSummaryIsPreview(false);
    persistedCsv.current = null;
    setShapeWarnings([]);
    setServerRows([]);
    setRowFilter("rows");
    setWarningsAcknowledged(false);
    setPendingHumanOnly({});
    setMidSendConfirm(null);
    setMidSendEdits([]);
    setMessage(null);
    setError(null);
    setSequenceType(pickDefaultSequence(outboundTypes));
  }

  function onSelectCampaign(value: string) {
    if (value === "new") {
      resetToNew();
      return;
    }
    const id = Number(value);
    const listed = campaigns.find((item) => item.id === id);
    if (listed) applyCampaign(listed);
    void loadCampaign(id);
  }

  async function persistCampaign(confirmMidSend = false) {
    if (!token) {
      fail("Sign in to save a campaign.");
      return;
    }
    if (!sequenceType) {
      fail("Pick an outbound sequence before saving.");
      return;
    }
    if (comparisonSelected) {
      fail("That sequence is a comparison follow-up. Pick an outbound sequence.");
      return;
    }
    setBusy(confirmMidSend ? "mid-send" : "save");
    setError(null);
    try {
      let id = campaignId;
      if (!id) {
        const created = await createCampaign(token, name, sequenceType);
        id = created.id;
        setCampaignId(id);
        setSelectedId(id);
      }
      await patchCampaign(token, id, {
        name,
        sequence_type: sequenceType,
        first_touch_subject: subject,
        first_touch_html: body,
        merge_field_map: columnMap,
        provenance_note: provenance,
        daily_cap: dailyCap ? Number(dailyCap) : null,
        send_window_start: sendWindowStart || "09:00",
        send_window_end: sendWindowEnd || "17:00",
        ...(confirmMidSend ? { confirm_mid_send_edit: true } : {}),
      });
      if (parsed && status === "draft") {
        const summary = await saveCampaignRows(token, id, headers, rawRows, columnMap);
        setRowCounts({
          rows: summary.rows,
          unique_recipients: summary.unique_recipients,
          pending: summary.pending ?? 0,
          sendable: summary.sendable ?? 0,
          human_only: summary.human_only ?? 0,
          warnings: summary.warnings ?? 0,
          test_sends: rowCounts?.test_sends || 0,
        });
        setShapeWarnings(summary.shape_warnings ?? []);
        const suppressed = summary.suppressed_addresses ?? [];
        if (suppressed.length) {
          const named =
            suppressed.length === 1
              ? `${suppressed[0]} has unsubscribed`
              : `These addresses have unsubscribed: ${suppressed.join(", ")}`;
          applyCampaign(await getCampaign(token, id));
          await refreshList();
          fail(named);
          return;
        }
      }
      let saved = await getCampaign(token, id);
      const savedRows = saved.rows ?? [];
      for (const [flagKey, flag] of Object.entries(pendingHumanOnly)) {
        const row = savedRows.find((item) => recipientFlagKey(item) === flagKey);
        if (!row || row.row_status === "started" || row.run_id) continue;
        if (Boolean(row.human_only) === flag.human_only && (row.human_only_reason || "") === (flag.reason || "")) {
          continue;
        }
        await setCampaignRowHumanOnly(token, id, row.id, flag.human_only, flag.reason);
      }
      saved = await getCampaign(token, id);
      applyCampaign(saved);
      await refreshList();
      setMidSendConfirm(null);
      ok(status === "draft" ? "Draft saved." : "Email saved.");
    } catch (e) {
      if (e instanceof MidSendEditError) {
        setMidSendConfirm({ already_sent: e.already_sent, will_get_new: e.will_get_new });
        return;
      }
      fail(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function onSave() {
    await persistCampaign(false);
  }

  async function onConfirmMidSendEdit() {
    await persistCampaign(true);
  }

  function onCancelMidSendEdit() {
    setMidSendConfirm(null);
  }

  async function onTestSend() {
    if (!token || campaignId == null) {
      fail("Save the campaign first, then send a test.");
      return;
    }
    const row =
      serverRows.find((item) => item.merge_json.company_name === currentMergeRow.company_name) ||
      (currentSourceIndex != null ? serverRows[currentSourceIndex] : undefined) ||
      serverRows[0];
    if (!row) {
      fail("Save the list first, then send a test using the previewed recipient.");
      return;
    }
    if (!testTo.trim()) {
      fail("Enter the address to send the test to.");
      return;
    }
    setBusy("test");
    setError(null);
    try {
      const result = await sendCampaignTest(token, campaignId, testTo, row.id);
      applyCampaign(await getCampaign(token, campaignId));
      ok(`Test sent to ${result.to} — ${result.subject}`);
    } catch (e) {
      fail(e instanceof Error ? e.message : "Test send failed");
    } finally {
      setBusy(null);
    }
  }

  async function onReady() {
    if (!token || campaignId == null) {
      fail("Save the campaign first.");
      return;
    }
    const warningCount = rowCounts?.warnings ?? 0;
    if (warningCount > 0 && !warningsAcknowledged) {
      fail(
        `${warningCount} rows have shape warnings and will not be sent. Tick the acknowledgement naming that count to mark ready.`,
      );
      return;
    }
    setBusy("ready");
    setError(null);
    try {
      await patchCampaign(token, campaignId, {
        status: "ready",
        ...(warningCount > 0 ? { acknowledge_warnings: warningCount } : {}),
      });
      applyCampaign(await getCampaign(token, campaignId));
      ok("Ready to send. Start list when you want the first-touch to go out.");
    } catch (e) {
      fail(e instanceof Error ? e.message : "Could not mark ready");
    } finally {
      setBusy(null);
    }
  }

  async function persistThrottle() {
    if (!token || campaignId == null || !throttleEditable) return;
    applyCampaign(
      await patchCampaign(token, campaignId, {
        daily_cap: dailyCap.trim() ? Number(dailyCap) : null,
        send_window_start: sendWindowStart || null,
        send_window_end: sendWindowEnd || null,
      }),
    );
  }

  async function onStart() {
    if (!token || campaignId == null) {
      fail("Save and mark ready first.");
      return;
    }
    setBusy("start");
    setError(null);
    try {
      await persistThrottle();
      const result = await startCampaign(token, campaignId);
      applyCampaign(await getCampaign(token, campaignId));
      const skipped = result.skipped_suppressed_addresses ?? [];
      if (result.started === 0 && result.reason === "daily_cap") {
        fail(
          `Daily cap already reached today (${result.started_today ?? 0}/${result.daily_cap ?? 0}). Raise the limit and press Start, or Send next N to go past it.`,
        );
        return;
      }
      if (skipped.length) {
        const named =
          skipped.length === 1
            ? `${skipped[0]} has unsubscribed`
            : `These addresses have unsubscribed: ${skipped.join(", ")}`;
        if (result.started > 0) {
          ok(`Started ${result.started} · ${named}`);
        } else {
          fail(named);
        }
      } else {
        ok(`Started ${result.started} · ${result.pending} still pending`);
      }
    } catch (e) {
      fail(e instanceof Error ? e.message : "Start failed");
    } finally {
      setBusy(null);
    }
  }

  async function onPause() {
    if (!token || campaignId == null) return;
    setBusy("pause");
    setError(null);
    try {
      await pauseCampaign(token, campaignId);
      applyCampaign(await getCampaign(token, campaignId));
      ok("Paused. Already-started sequences keep running.");
    } catch (e) {
      fail(e instanceof Error ? e.message : "Pause failed");
    } finally {
      setBusy(null);
    }
  }

  async function onResume() {
    if (!token || campaignId == null) return;
    setBusy("resume");
    setError(null);
    try {
      await resumeCampaign(token, campaignId);
      applyCampaign(await getCampaign(token, campaignId));
      ok("Resumed.");
    } catch (e) {
      fail(e instanceof Error ? e.message : "Resume failed");
    } finally {
      setBusy(null);
    }
  }

  async function onSaveThrottle() {
    if (!token || campaignId == null) {
      fail("Save the campaign first.");
      return;
    }
    setBusy("throttle");
    setError(null);
    try {
      await persistThrottle();
      ok("Send limits saved.");
    } catch (e) {
      fail(e instanceof Error ? e.message : "Could not save send limits");
    } finally {
      setBusy(null);
    }
  }

  async function onSendNext() {
    if (!token || campaignId == null) {
      fail("Save and mark ready first.");
      return;
    }
    const n = Number(sendNextN);
    if (!Number.isFinite(n) || n < 1) {
      fail("Enter how many to send now.");
      return;
    }
    setBusy("send-next");
    setError(null);
    try {
      const result = await sendCampaignNextN(token, campaignId, n);
      applyCampaign(await getCampaign(token, campaignId));
      ok(`Sent ${result.started} now · ${result.pending} still pending`);
    } catch (e) {
      fail(e instanceof Error ? e.message : "Could not send the next batch");
    } finally {
      setBusy(null);
    }
  }

  function onToggleSelected(id: number, checked: boolean) {
    setSelectedIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((item) => item !== id);
    });
  }

  function onToggleSelectedAll(checked: boolean) {
    const visible = campaigns.filter((campaign) =>
      listTab === "finished"
        ? Boolean(campaign.archived) || campaign.status === "done"
        : !campaign.archived && campaign.status !== "done",
    );
    setSelectedIds(checked ? visible.map((item) => item.id) : []);
  }

  async function onArchive(id?: number) {
    const targetId = id ?? campaignId;
    if (!token || targetId == null) {
      fail("Save the campaign first, then archive it.");
      return;
    }
    setBusy("archive");
    setError(null);
    try {
      await archiveCampaign(token, targetId);
      if (targetId === campaignId && listTab !== "finished") resetToNew();
      else if (targetId === campaignId) applyCampaign(await getCampaign(token, targetId));
      await refreshList();
      ok("Campaign archived.");
    } catch (e) {
      fail(e instanceof Error ? e.message : "Could not archive campaign");
    } finally {
      setBusy(null);
    }
  }

  async function onUnarchive(id?: number) {
    const targetId = id ?? campaignId;
    if (!token || targetId == null) return;
    setBusy("unarchive");
    setError(null);
    try {
      const updated = await unarchiveCampaign(token, targetId);
      if (targetId === campaignId) applyCampaign(updated);
      await refreshList();
      ok("Campaign restored.");
    } catch (e) {
      fail(e instanceof Error ? e.message : "Could not unarchive campaign");
    } finally {
      setBusy(null);
    }
  }

  async function onArchiveSelected() {
    if (!token || selectedIds.length === 0) return;
    setBusy("archive-selected");
    setError(null);
    try {
      const ids = [...selectedIds];
      await archiveCampaigns(token, ids);
      if (campaignId != null && ids.includes(campaignId) && listTab !== "finished") resetToNew();
      setSelectedIds([]);
      await refreshList();
      ok(ids.length === 1 ? "Campaign archived." : `Archived ${ids.length} campaigns.`);
    } catch (e) {
      fail(e instanceof Error ? e.message : "Could not archive campaigns");
    } finally {
      setBusy(null);
    }
  }

  async function deleteById(targetId: number, confirm: boolean) {
    if (!token) {
      fail("Sign in to delete a campaign.");
      return;
    }
    setBusy("delete");
    setError(null);
    try {
      await deleteCampaign(token, targetId, confirm);
      setDeleteBlock(null);
      setDeleteTargetId(null);
      if (targetId === campaignId) resetToNew();
      await refreshList();
      ok("Campaign deleted.");
    } catch (e) {
      if (e instanceof CampaignDeleteError) {
        setDeleteTargetId(targetId);
        setDeleteBlock({
          confirm_required: true,
          message: e.message,
          runs: e.runs,
          offers: e.offers,
        });
        return;
      }
      fail(e instanceof Error ? e.message : "Could not delete campaign");
    } finally {
      setBusy(null);
    }
  }

  async function onDelete(id?: number) {
    const targetId = id ?? campaignId;
    if (targetId == null) {
      fail("Save the campaign first, then delete it.");
      return;
    }
    setDeleteBlock(null);
    setDeleteTargetId(targetId);
    await deleteById(targetId, false);
  }

  async function onConfirmDelete() {
    if (deleteTargetId == null) return;
    await deleteById(deleteTargetId, true);
  }

  function onCancelDelete() {
    setDeleteBlock(null);
    setDeleteTargetId(null);
  }

  async function onDeleteSuppression(id: number) {
    if (!token) return;
    setBusy("suppression");
    try {
      await deleteSuppression(token, id);
      setSuppressions((prev) => prev.filter((row) => row.id !== id));
      ok("Suppression cleared. That address can be uploaded again.");
    } catch (e) {
      fail(e instanceof Error ? e.message : "Could not remove suppression");
    } finally {
      setBusy(null);
    }
  }

  async function onSetHumanOnly(rowId: number, human_only: boolean, reason?: string) {
    const row = serverRows.find((item) => item.id === rowId);
    const flagKey = row ? recipientFlagKey(row) : `row:${rowId}`;
    setPendingHumanOnly((prev) => ({
      ...prev,
      [flagKey]: { human_only, reason },
    }));
    if (!token || campaignId == null || summaryIsPreview || rowId < 0) {
      return;
    }
    setBusy(`human-only-${rowId}`);
    setError(null);
    try {
      await setCampaignRowHumanOnly(token, campaignId, rowId, human_only, reason);
      applyCampaign(await getCampaign(token, campaignId));
    } catch (e) {
      fail(e instanceof Error ? e.message : "Could not update human-only flag");
    } finally {
      setBusy(null);
    }
  }

  const flaggedRows = useMemo(
    () => applyPendingHumanOnly(serverRows, pendingHumanOnly),
    [serverRows, pendingHumanOnly],
  );
  const flaggedCounts = useMemo(() => {
    if (!rowCounts) return null;
    const computed = countsFromCampaignRows(flaggedRows);
    return {
      ...rowCounts,
      sendable: computed.sendable,
      pending: computed.sendable,
      human_only: computed.human_only,
    };
  }, [rowCounts, flaggedRows]);

  const value: CampaignCtx = {
    token,
    selectedId,
    name,
    setName,
    sequenceType,
    setSequenceType,
    status,
    provenance,
    setProvenance,
    dailyCap,
    setDailyCap,
    sendWindowStart,
    setSendWindowStart,
    sendWindowEnd,
    setSendWindowEnd,
    sendNextN,
    setSendNextN,
    testTo,
    setTestTo,
    busy,
    message,
    error,
    dismissError: () => setError(null),
    rowCounts: flaggedCounts,
    summaryIsPreview,
    shapeWarnings,
    serverRows: flaggedRows,
    rowFilter,
    setRowFilter,
    warningsAcknowledged,
    setWarningsAcknowledged,
    onSetHumanOnly,
    canFlagHumanOnly,
    campaignId,
    campaigns,
    archived,
    listTab,
    setListTab,
    showArchived,
    setShowArchived,
    selectedIds,
    onToggleSelected,
    onToggleSelectedAll,
    onArchiveSelected,
    onArchive,
    onUnarchive,
    onDelete,
    onConfirmDelete,
    onCancelDelete,
    deleteTargetId,
    deleteBlock,
    dropdownTypes,
    comparisonSelected,
    readOnly,
    contentEditable,
    throttleEditable,
    resolvedSubject,
    currentLabel,
    onSelectCampaign,
    onSave,
    midSendConfirm,
    onConfirmMidSendEdit,
    onCancelMidSendEdit,
    scheduleTimezone,
    midSendEdits,
    onSaveThrottle,
    onTestSend,
    onReady,
    onStart,
    onSendNext,
    onPause,
    onResume,
    suppressions,
    suppressionsError,
    onDeleteSuppression,
  };

  return (
    <Ctx.Provider value={value}>
      {error ? (
        <div
          className="sticky top-16 z-20 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-100"
          role="alert"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium">{error}</p>
            <button type="button" className="shrink-0 text-xs underline" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
      {children}
    </Ctx.Provider>
  );
}

function CampaignDeleteConfirm({
  block,
  busy,
  onConfirm,
  onCancel,
}: {
  block: CampaignDeleteBlocked;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100">
      <p className="font-medium">{block.message}</p>
      <p className="mt-1 text-xs opacity-80">This cannot be undone.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="danger" size="sm" onClick={onConfirm} disabled={busy} loading={busy}>
          Delete campaign, runs and offers
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function CampaignSetupCard() {
  const {
    selectedId,
    name,
    setName,
    sequenceType,
    setSequenceType,
    campaigns,
    listTab,
    setListTab,
    selectedIds,
    onToggleSelected,
    onToggleSelectedAll,
    onArchiveSelected,
    onArchive,
    onUnarchive,
    onDelete,
    onConfirmDelete,
    onCancelDelete,
    deleteTargetId,
    deleteBlock,
    dropdownTypes,
    comparisonSelected,
    readOnly,
    onSelectCampaign,
    busy,
  } = useCampaign();

  const visibleCampaigns = campaigns.filter((campaign) =>
    listTab === "finished"
      ? Boolean(campaign.archived) || campaign.status === "done"
      : !campaign.archived && campaign.status !== "done",
  );
  const openCampaigns = campaigns.filter(
    (campaign) => !campaign.archived && campaign.status !== "done",
  );
  const selectedMissingFromOpen =
    typeof selectedId === "number" && !openCampaigns.some((campaign) => campaign.id === selectedId);
  const allSelected = visibleCampaigns.length > 0 && selectedIds.length === visibleCampaigns.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>1. Campaign</CardTitle>
        <CardDescription>
          Name it and pick the outbound sequence that should run after the first email. Comparison
          follow-ups (Base 2, solar, invoice offers) are not listed here — those still start from
          their product pages. Archive test campaigns to hide them from Open; delete only when you
          also want their stub offers and runs gone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Select
            label="Open"
            value={selectedId === "new" ? "new" : String(selectedId)}
            onChange={(e) => onSelectCampaign(e.target.value)}
            className="px-3 py-1.5"
          >
            <option value="new">New campaign</option>
            {openCampaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.status})
              </option>
            ))}
            {selectedMissingFromOpen && typeof selectedId === "number" ? (
              <option value={selectedId}>{name} (archived)</option>
            ) : null}
          </Select>
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={readOnly}
            className="px-3 py-2"
          />
          <Select
            label="Sequence after first email"
            value={sequenceType}
            onChange={(e) => setSequenceType(e.target.value)}
            disabled={readOnly}
            className="px-3 py-1.5"
            error={comparisonSelected ? "This is a comparison follow-up. Choose an outbound sequence." : undefined}
            hint={
              dropdownTypes.length === 0
                ? "No outbound sequences yet. Create one on Autonomous Agent and do not link it to a comparison."
                : "Only sequences that are not linked to a comparison."
            }
          >
            {dropdownTypes.length === 0 ? <option value="">No outbound sequences</option> : null}
            {dropdownTypes.map((t) => (
              <option key={t.sequence_type} value={t.sequence_type}>
                {t.display_name}
                {isComparisonLinkedTemplate(t) ? " (comparison — do not use)" : ""}
              </option>
            ))}
          </Select>
        </div>
        {busy === "load" ? <p className="text-xs text-gray-500">Loading campaign…</p> : null}

        <div className="rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 px-3 py-2 dark:border-gray-700">
            <div
              className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-0.5 dark:border-gray-700 dark:bg-gray-900"
              role="tablist"
              aria-label="Campaign list"
            >
              {(["running", "finished"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={listTab === tab}
                  onClick={() => setListTab(tab)}
                  className={
                    listTab === tab
                      ? "rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white"
                      : "rounded-md px-3 py-1 text-xs font-medium text-gray-500"
                  }
                >
                  {tab === "running" ? "Running" : "Finished"}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(event) => onToggleSelectedAll(event.target.checked)}
                disabled={visibleCampaigns.length === 0}
              />
              <span className="text-gray-600 dark:text-gray-300">Select all</span>
            </label>
            <Button
              onClick={() => void onArchiveSelected()}
              disabled={selectedIds.length === 0 || busy !== null}
              loading={busy === "archive-selected"}
            >
              Archive selected
              {selectedIds.length ? ` (${selectedIds.length})` : ""}
            </Button>
          </div>
          {visibleCampaigns.length === 0 ? (
            <p className="px-3 py-3 text-sm text-gray-500">
              {listTab === "finished" ? "No finished campaigns." : "No running campaigns."}
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {visibleCampaigns.map((campaign) => (
                <li key={campaign.id} className="space-y-2 px-3 py-2 text-sm">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(campaign.id)}
                      onChange={(event) => onToggleSelected(campaign.id, event.target.checked)}
                      aria-label={`Select ${campaign.name}`}
                    />
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => onSelectCampaign(String(campaign.id))}
                    >
                      <span className="block truncate font-medium">{campaign.name}</span>
                      <span className="text-xs text-gray-500">
                        {campaign.status}
                        {campaign.archived ? " · archived" : ""}
                        {campaign.row_counts
                          ? ` · ${campaign.row_counts.sendable ?? 0} sendable`
                          : ""}
                      </span>
                    </button>
                    {campaign.archived ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void onUnarchive(campaign.id)}
                        disabled={busy !== null}
                        loading={busy === "unarchive"}
                      >
                        Unarchive
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => void onArchive(campaign.id)}
                        disabled={busy !== null}
                        loading={busy === "archive"}
                      >
                        Archive
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => void onDelete(campaign.id)}
                      disabled={busy !== null}
                      loading={busy === "delete" && deleteTargetId === campaign.id && !deleteBlock}
                    >
                      Delete
                    </Button>
                  </div>
                  {deleteTargetId === campaign.id && deleteBlock ? (
                    <CampaignDeleteConfirm
                      block={deleteBlock}
                      busy={busy === "delete"}
                      onConfirm={() => void onConfirmDelete()}
                      onCancel={onCancelDelete}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function CampaignSendCard() {
  const {
    token,
    dailyCap,
    setDailyCap,
    sendWindowStart,
    setSendWindowStart,
    sendWindowEnd,
    setSendWindowEnd,
    sendNextN,
    setSendNextN,
    testTo,
    setTestTo,
    busy,
    message,
    error,
    rowCounts,
    warningsAcknowledged,
    setWarningsAcknowledged,
    campaignId,
    comparisonSelected,
    contentEditable,
    throttleEditable,
    resolvedSubject,
    currentLabel,
    status,
    onSave,
    midSendConfirm,
    onConfirmMidSendEdit,
    onCancelMidSendEdit,
    scheduleTimezone,
    midSendEdits,
    onSaveThrottle,
    onTestSend,
    onReady,
    onStart,
    onSendNext,
    onPause,
    onResume,
    archived,
    onArchive,
    onUnarchive,
    onDelete,
    onConfirmDelete,
    onCancelDelete,
    deleteTargetId,
    deleteBlock,
  } = useCampaign();

  const warningCount = rowCounts?.warnings ?? 0;
  const sendable = rowCounts?.sendable ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>5. Save, test, send</CardTitle>
        <CardDescription>
          Save the draft, send one test to yourself, then mark ready and start the list. Failures
          show in the red bar at the top of this page as well as a toast.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            label="Max sends per day"
            type="number"
            value={dailyCap}
            onChange={(e) => setDailyCap(e.target.value)}
            disabled={!throttleEditable}
            className="px-3 py-2"
          />
          <Input
            label="Send window start"
            type="time"
            value={sendWindowStart}
            onChange={(e) => setSendWindowStart(e.target.value)}
            disabled={!throttleEditable}
            className="px-3 py-2"
          />
          <Input
            label="Send window end"
            type="time"
            value={sendWindowEnd}
            onChange={(e) => setSendWindowEnd(e.target.value)}
            disabled={!throttleEditable}
            className="px-3 py-2"
          />
        </div>
        <p className="text-xs text-gray-500">
          Send window and daily cap reset are evaluated in {formatScheduleZone(scheduleTimezone)}.
        </p>
        {midSendEdits.length > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
            <p className="font-semibold">Email was edited mid-send</p>
            {midSendEdits.map((edit) => (
              <p key={edit.id} className="mt-1 text-xs">
                {(edit.payload.already_sent ?? 0)} already sent · {(edit.payload.will_get_new ?? 0)} got
                the new version
                {edit.actor ? ` · ${edit.actor}` : ""}
                {edit.created_at ? ` · ${new Date(edit.created_at).toLocaleString("en-AU")}` : ""}
              </p>
            ))}
          </div>
        ) : null}
        {midSendConfirm ? (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-3 text-sm text-indigo-950 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-100">
            <p className="font-semibold">This campaign has already started sending</p>
            <p className="mt-1">
              {midSendConfirm.already_sent} {midSendConfirm.already_sent === 1 ? "has" : "have"} already
              gone. {midSendConfirm.will_get_new} will get the new version.
            </p>
            <div className="mt-3 flex gap-2">
              <Button onClick={() => void onConfirmMidSendEdit()} loading={busy === "mid-send"}>
                Save new version
              </Button>
              <Button variant="ghost" onClick={onCancelMidSendEdit} disabled={busy !== null}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <Badge intent={status === "draft" ? "neutral" : status === "ready" ? "info" : "success"}>
            {status}
          </Badge>
          <Button
            onClick={() => void onSave()}
            disabled={!token || !contentEditable || busy !== null || comparisonSelected}
            loading={busy === "save" || busy === "mid-send"}
          >
            {status === "draft" ? "Save draft" : "Save email"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => void onSaveThrottle()}
            disabled={!token || campaignId == null || !throttleEditable || busy !== null}
            loading={busy === "throttle"}
          >
            Save limits
          </Button>
          <Button
            variant="secondary"
            onClick={() => void onReady()}
            disabled={
              !token ||
              campaignId == null ||
              status !== "draft" ||
              busy !== null ||
              (warningCount > 0 && !warningsAcknowledged)
            }
            loading={busy === "ready"}
          >
            Mark ready
          </Button>
          <Button
            onClick={() => void onStart()}
            disabled={!token || campaignId == null || (status !== "ready" && status !== "sending") || busy !== null}
            loading={busy === "start"}
          >
            Start list
          </Button>
          <Button
            variant="secondary"
            onClick={() => void onPause()}
            disabled={!token || campaignId == null || (status !== "ready" && status !== "sending") || busy !== null}
          >
            Pause
          </Button>
          <Button
            variant="ghost"
            onClick={() => void onResume()}
            disabled={!token || campaignId == null || status !== "paused" || busy !== null}
          >
            Resume
          </Button>
        </div>
        {status === "ready" || status === "sending" ? (
          <div className="flex flex-wrap items-end gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-3 dark:border-indigo-900/50 dark:bg-indigo-950/30">
            <Input
              label="Send next N now"
              type="number"
              value={sendNextN}
              onChange={(e) => setSendNextN(e.target.value)}
              disabled={busy !== null}
              className="w-28 px-3 py-2"
            />
            <Button
              onClick={() => void onSendNext()}
              disabled={!token || campaignId == null || busy !== null}
              loading={busy === "send-next"}
            >
              Send now
            </Button>
            <p className="text-xs text-indigo-900 dark:text-indigo-200">
              Bypasses today&apos;s cap for this batch only. Does not reset the counter. Recorded as
              who sent it.
            </p>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          {archived ? (
            <Button
              variant="secondary"
              onClick={() => void onUnarchive()}
              disabled={!token || campaignId == null || busy !== null}
              loading={busy === "unarchive"}
            >
              Unarchive
            </Button>
          ) : (
            <Button
              onClick={() => void onArchive()}
              disabled={!token || campaignId == null || busy !== null}
              loading={busy === "archive"}
            >
              Archive
            </Button>
          )}
          <Button
            variant="danger"
            onClick={() => void onDelete()}
            disabled={!token || campaignId == null || busy !== null}
            loading={busy === "delete" && !deleteBlock}
          >
            Delete
          </Button>
        </div>
        {deleteBlock && (deleteTargetId == null || deleteTargetId === campaignId) ? (
          <CampaignDeleteConfirm
            block={deleteBlock}
            busy={busy === "delete"}
            onConfirm={() => void onConfirmDelete()}
            onCancel={onCancelDelete}
          />
        ) : null}
        {warningCount > 0 && status === "draft" ? (
          <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
            <input
              type="checkbox"
              className="mt-1"
              checked={warningsAcknowledged}
              onChange={(event) => setWarningsAcknowledged(event.target.checked)}
            />
            <span>
              {warningCount} flagged rows will not be emailed. Mark ready for the remaining {sendable}{" "}
              sendable recipients.
            </span>
          </label>
        ) : null}
        <p className="text-xs text-gray-500">
          Mark ready needs a saved draft and one test send. Daily cap and send window stay editable
          after a campaign starts. Send next N now releases a batch without resetting today&apos;s
          counter. Pause stops new first-touch sends only — already-running sequences keep going
          until you stop them on Autonomous Agent.
        </p>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
          <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">Send a test</p>
          <p className="mt-1 text-xs text-amber-900 dark:text-amber-200">
            Uses merge data from {currentLabel}. Does not start a sequence or touch the list.
            Subject is prefixed with [TEST].
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <Input
              label="Send test to"
              type="email"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              className="px-3 py-2"
            />
            <Button onClick={() => void onTestSend()} disabled={!token || busy !== null} loading={busy === "test"}>
              Send test
            </Button>
          </div>
          <p className="mt-2 text-xs text-amber-900 dark:text-amber-200">
            Subject that will send: [TEST] {resolvedSubject || "(empty — save a subject first)"}
          </p>
        </div>

        {rowCounts ? (
          <p className="text-sm font-semibold">
            {rowCounts.rows} rows · {rowCounts.unique_recipients} distinct · {sendable} sendable ·{" "}
            {rowCounts.human_only} human only · {warningCount} warnings · {rowCounts.test_sends} tests
            sent
          </p>
        ) : null}
        {message && !error ? (
          <p className="text-sm text-emerald-800 dark:text-emerald-200">{message}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function CampaignSuppressionsCard() {
  const { suppressions, suppressionsError, onDeleteSuppression, busy } = useCampaign();
  const [reasonFilter, setReasonFilter] = useState("all");
  const reasons = useMemo(() => {
    const found = new Set<string>();
    for (const row of suppressions) {
      found.add(row.reason || "unspecified");
    }
    return [...found].sort();
  }, [suppressions]);
  const visible = suppressions.filter(
    (row) => reasonFilter === "all" || (row.reason || "unspecified") === reasonFilter,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Suppressed addresses</CardTitle>
        <CardDescription>
          Addresses that will not be emailed. The reason says whether it was an unsubscribe or a
          deliverability problem. Remove a row to allow that address on the next upload or start.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {suppressionsError ? <p className="text-sm text-red-700">{suppressionsError}</p> : null}
        {suppressions.length === 0 && !suppressionsError ? (
          <p className="text-sm text-gray-500">No suppressions.</p>
        ) : (
          <>
            <Select
              label="Reason"
              value={reasonFilter}
              onChange={(event) => setReasonFilter(event.target.value)}
              wrapperClassName="max-w-xs"
            >
              <option value="all">All reasons ({suppressions.length})</option>
              {reasons.map((reason) => (
                <option key={reason} value={reason}>
                  {reason} ({suppressions.filter((row) => (row.reason || "unspecified") === reason).length})
                </option>
              ))}
            </Select>
            {visible.length === 0 ? (
              <p className="text-sm text-gray-500">No addresses with that reason.</p>
            ) : (
              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-700">
                {visible.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{row.email}</span>
                      <span className="text-xs text-gray-500">
                        {row.reason || "unspecified"}
                        {row.source ? ` · ${row.source}` : ""}
                      </span>
                    </span>
                    <Button
                      variant="secondary"
                      onClick={() => void onDeleteSuppression(row.id)}
                      disabled={busy !== null}
                      loading={busy === "suppression"}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function CampaignControls(props: Omit<Props, "children">) {
  return (
    <CampaignWorkspace {...props}>
      <div className="space-y-5">
        <CampaignSetupCard />
        <CampaignSendCard />
        <CampaignSuppressionsCard />
      </div>
    </CampaignWorkspace>
  );
}
