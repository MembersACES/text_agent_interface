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
  createCampaign,
  getCampaign,
  listCampaigns,
  listSequenceTypes,
  patchCampaign,
  pauseCampaign,
  resumeCampaign,
  saveCampaignRows,
  sendCampaignTest,
  startCampaign,
  type CampaignSequenceOption,
  type CampaignStatus,
  type CampaignSummary,
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
  campaignId: number | null;
  campaigns: CampaignSummary[];
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
};

const Ctx = createContext<CampaignCtx | null>(null);

function useCampaign() {
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
  const [campaignId, setCampaignId] = useState<number | null>(null);
  const [serverRows, setServerRows] = useState<{ id: number; sourceHint: string }[]>([]);

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

  useEffect(() => {
    if (!token) return;
    void listCampaigns(token)
      .then(setCampaigns)
      .catch((e) => fail(e instanceof Error ? e.message : "Could not list campaigns"));
    void listSequenceTypes(token)
      .then((items) => {
        const outbound = items.filter((t) => t.is_active && !isComparisonLinkedTemplate(t));
        setTypes(items);
        setSequenceType((current) => current || pickDefaultSequence(outbound));
      })
      .catch((e) => fail(e instanceof Error ? e.message : "Could not load sequences"));
  }, [token, fail]);

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
    setRowCounts(campaign.row_counts);
    setServerRows(
      (campaign.rows || []).map((row) => ({
        id: row.id,
        sourceHint: row.merge_json.company_name || row.recipient_key || String(row.id),
      })),
    );
    setMessage(
      `${campaign.row_counts.rows} rows · ${campaign.row_counts.unique_recipients} unique recipients · ${campaign.row_counts.human_only} human only`,
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

  function onSelectCampaign(value: string) {
    if (value === "new") {
      setSelectedId("new");
      setCampaignId(null);
      setStatus("draft");
      setRowCounts(null);
      setServerRows([]);
      setMessage(null);
      setError(null);
      setSequenceType(pickDefaultSequence(outboundTypes));
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
          pending: summary.rows,
          human_only: 0,
          test_sends: rowCounts?.test_sends || 0,
        });
      }
      applyCampaign(await getCampaign(token, id));
      setCampaigns(await listCampaigns(token));
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
      serverRows.find((item) => item.sourceHint === currentMergeRow.company_name) ||
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
    setBusy("ready");
    setError(null);
    try {
      applyCampaign(await patchCampaign(token, campaignId, { status: "ready" }));
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
      ok(`Started ${result.started} · ${result.pending} still pending`);
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
    campaignId,
    campaigns,
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

export function CampaignSetupCard() {
  const {
    selectedId,
    name,
    setName,
    sequenceType,
    setSequenceType,
    campaigns,
    dropdownTypes,
    comparisonSelected,
    readOnly,
    onSelectCampaign,
    busy,
  } = useCampaign();

  return (
    <Card>
      <CardHeader>
        <CardTitle>1. Campaign</CardTitle>
        <CardDescription>
          Name it and pick the outbound sequence that should run after the first email. Comparison
          follow-ups (Base 2, solar, invoice offers) are not listed here — those still start from
          their product pages.
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
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.status})
              </option>
            ))}
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
  } = useCampaign();

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
            disabled={!token || campaignId == null || status !== "draft" || busy !== null}
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
            {rowCounts.rows} rows · {rowCounts.unique_recipients} unique recipients ·{" "}
            {rowCounts.human_only} held back · {rowCounts.test_sends} tests sent
          </p>
        ) : null}
        {message && !error ? (
          <p className="text-sm text-emerald-800 dark:text-emerald-200">{message}</p>
        ) : null}
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
      </div>
    </CampaignWorkspace>
  );
}
