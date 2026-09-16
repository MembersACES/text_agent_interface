"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  setCampaignRowHumanOnly,
  startCampaign,
  unarchiveCampaign,
  type CampaignDeleteBlocked,
  type CampaignRowPayload,
  type CampaignSequenceOption,
  type CampaignShapeWarning,
  type CampaignStatus,
  type CampaignSummary,
  type SuppressionRow,
} from "@/lib/campaign-api";
import { renderTemplate } from "@/lib/merge-template";

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
  testTo: string;
  setTestTo: (value: string) => void;
  busy: string | null;
  message: string | null;
  error: string | null;
  dismissError: () => void;
  rowCounts: CampaignSummary["row_counts"] | null;
  shapeWarnings: CampaignShapeWarning[];
  serverRows: CampaignRowPayload[];
  rowFilter: CampaignRowFilter;
  setRowFilter: (value: CampaignRowFilter) => void;
  warningsAcknowledged: boolean;
  setWarningsAcknowledged: (value: boolean) => void;
  onSetHumanOnly: (rowId: number, human_only: boolean, reason?: string) => Promise<void>;
  campaignId: number | null;
  campaigns: CampaignSummary[];
  archived: boolean;
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
  resolvedSubject: string;
  currentLabel: string;
  onSelectCampaign: (value: string) => void;
  onSave: () => Promise<void>;
  onTestSend: () => Promise<void>;
  onReady: () => Promise<void>;
  onStart: () => Promise<void>;
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
  const [testTo, setTestTo] = useState(userEmail);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rowCounts, setRowCounts] = useState<CampaignSummary["row_counts"] | null>(null);
  const [shapeWarnings, setShapeWarnings] = useState<CampaignShapeWarning[]>([]);
  const [campaignId, setCampaignId] = useState<number | null>(null);
  const [serverRows, setServerRows] = useState<CampaignRowPayload[]>([]);
  const [rowFilter, setRowFilter] = useState<CampaignRowFilter>("rows");
  const [warningsAcknowledged, setWarningsAcknowledged] = useState(false);
  const [suppressions, setSuppressions] = useState<SuppressionRow[]>([]);
  const [suppressionsError, setSuppressionsError] = useState<string | null>(null);
  const [archived, setArchived] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleteBlock, setDeleteBlock] = useState<CampaignDeleteBlocked | null>(null);

  const readOnly = status !== "draft";
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
    const items = await listCampaigns(token, showArchived);
    setCampaigns(items);
    const valid = new Set(items.map((item) => item.id));
    setSelectedIds((prev) => prev.filter((id) => valid.has(id)));
  }, [token, showArchived]);

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
    setArchived(Boolean(campaign.archived));
    if (campaign.rows) {
      setServerRows(
        campaign.rows.map((row) => ({
          ...row,
          shape_warnings: row.shape_warnings || [],
          human_only_reason: row.human_only_reason ?? null,
        })),
      );
    }
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
    setShapeWarnings([]);
    setServerRows([]);
    setRowFilter("rows");
    setWarningsAcknowledged(false);
    setMessage(null);
    setError(null);
    setSequenceType(pickDefaultSequence(outboundTypes));
  }

  function onSelectCampaign(value: string) {
    if (value === "new") {
      resetToNew();
      return;
    }
    void loadCampaign(Number(value));
  }

  async function onSave() {
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
    setBusy("save");
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
        send_window_start: "09:00",
        send_window_end: "17:00",
      });
      if (parsed) {
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
      applyCampaign(await getCampaign(token, id));
      await refreshList();
      ok("Draft saved.");
    } catch (e) {
      fail(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
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
      applyCampaign(
        await patchCampaign(token, campaignId, {
          status: "ready",
          ...(warningCount > 0 ? { acknowledge_warnings: warningCount } : {}),
        }),
      );
      ok("Ready to send. Start list when you want the first-touch to go out.");
    } catch (e) {
      fail(e instanceof Error ? e.message : "Could not mark ready");
    } finally {
      setBusy(null);
    }
  }

  async function onStart() {
    if (!token || campaignId == null) {
      fail("Save and mark ready first.");
      return;
    }
    setBusy("start");
    setError(null);
    try {
      const result = await startCampaign(token, campaignId);
      applyCampaign(await getCampaign(token, campaignId));
      const skipped = result.skipped_suppressed_addresses ?? [];
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
      applyCampaign(await pauseCampaign(token, campaignId));
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
      applyCampaign(await resumeCampaign(token, campaignId));
      ok("Resumed.");
    } catch (e) {
      fail(e instanceof Error ? e.message : "Resume failed");
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
    setSelectedIds(checked ? campaigns.map((item) => item.id) : []);
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
      if (targetId === campaignId && !showArchived) resetToNew();
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
      if (campaignId != null && ids.includes(campaignId) && !showArchived) resetToNew();
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
    if (!token || campaignId == null) {
      fail("Save the campaign first, then flag rows.");
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
    testTo,
    setTestTo,
    busy,
    message,
    error,
    dismissError: () => setError(null),
    rowCounts,
    shapeWarnings,
    serverRows,
    rowFilter,
    setRowFilter,
    warningsAcknowledged,
    setWarningsAcknowledged,
    onSetHumanOnly,
    campaignId,
    campaigns,
    archived,
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
    resolvedSubject,
    currentLabel,
    onSelectCampaign,
    onSave,
    onTestSend,
    onReady,
    onStart,
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
    onSelectCampaign,
    busy,
  } = useCampaign();

  const openCampaigns = campaigns.filter((campaign) => !campaign.archived);
  const selectedMissingFromOpen =
    typeof selectedId === "number" && !openCampaigns.some((campaign) => campaign.id === selectedId);
  const allSelected = campaigns.length > 0 && selectedIds.length === campaigns.length;

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
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(event) => onToggleSelectedAll(event.target.checked)}
                disabled={campaigns.length === 0}
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
            <label className="ml-auto flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(event) => setShowArchived(event.target.checked)}
              />
              Show archived
            </label>
          </div>
          {campaigns.length === 0 ? (
            <p className="px-3 py-3 text-sm text-gray-500">
              {showArchived ? "No campaigns." : "No open campaigns."}
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {campaigns.map((campaign) => (
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
    readOnly,
    resolvedSubject,
    currentLabel,
    status,
    onSave,
    onTestSend,
    onReady,
    onStart,
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
        <Input
          label="Max sends per day"
          type="number"
          value={dailyCap}
          onChange={(e) => setDailyCap(e.target.value)}
          disabled={readOnly}
          className="max-w-xs px-3 py-2"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Badge intent={status === "draft" ? "neutral" : status === "ready" ? "info" : "success"}>
            {status}
          </Badge>
          <Button
            onClick={() => void onSave()}
            disabled={!token || readOnly || busy !== null || comparisonSelected}
            loading={busy === "save"}
          >
            Save draft
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
          Mark ready needs a saved draft and one test send. Pause stops new first-touch sends only —
          already-running sequences keep going until you stop them on Autonomous Agent.
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unsubscribed addresses</CardTitle>
        <CardDescription>
          Recipients who unsubscribed. Remove a row to allow that address on the next upload or start.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {suppressionsError ? <p className="text-sm text-red-700">{suppressionsError}</p> : null}
        {suppressions.length === 0 && !suppressionsError ? (
          <p className="text-sm text-gray-500">No suppressions.</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-700">
            {suppressions.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{row.email}</span>
                  <span className="text-xs text-gray-500">
                    {row.reason || "unsubscribed"}
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
