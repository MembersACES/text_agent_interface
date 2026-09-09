"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
};

export default function CampaignControls({
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
}: Props) {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [types, setTypes] = useState<{ sequence_type: string; display_name: string }[]>([]);
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

  useEffect(() => {
    setTestTo((prev) => prev || userEmail);
  }, [userEmail]);

  useEffect(() => {
    if (!token) return;
    void listCampaigns(token)
      .then(setCampaigns)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not list campaigns"));
    void listSequenceTypes(token)
      .then((items) => {
        setTypes(items);
        if (items[0] && !sequenceType) setSequenceType(items[0].sequence_type);
      })
      .catch(() => undefined);
  }, [token]);

  async function loadCampaign(id: number) {
    if (!token) return;
    setBusy("load");
    setError(null);
    try {
      const campaign = await getCampaign(token, id);
      applyCampaign(campaign);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setBusy(null);
    }
  }

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

  async function onSave() {
    if (!token) return;
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
        setMessage(
          `${summary.rows} rows · ${summary.unique_recipients} unique recipients (server)`,
        );
      }
      const fresh = await getCampaign(token, id);
      applyCampaign(fresh);
      const listed = await listCampaigns(token);
      setCampaigns(listed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function onTestSend() {
    if (!token || campaignId == null) {
      setError("Save the campaign before sending a test.");
      return;
    }
      const row =
        serverRows.find((item) => item.sourceHint === currentMergeRow.company_name) ||
        (currentSourceIndex != null ? serverRows[currentSourceIndex] : undefined) ||
        serverRows[0];
    if (!row) {
      setError("Save rows first, then send a test using the selected recipient.");
      return;
    }
    setBusy("test");
    setError(null);
    try {
      const result = await sendCampaignTest(token, campaignId, testTo, row.id);
      setMessage(`Test sent to ${result.to} — ${result.subject}`);
      const fresh = await getCampaign(token, campaignId);
      applyCampaign(fresh);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Test send failed");
    } finally {
      setBusy(null);
    }
  }

  async function onReady() {
    if (!token || campaignId == null) return;
    setBusy("ready");
    setError(null);
    try {
      const campaign = await patchCampaign(token, campaignId, { status: "ready" });
      applyCampaign(campaign);
      setMessage("Campaign is ready. Start sends to the list from here.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not mark ready");
    } finally {
      setBusy(null);
    }
  }

  async function onStart() {
    if (!token || campaignId == null) return;
    setBusy("start");
    setError(null);
    try {
      const result = await startCampaign(token, campaignId);
      setMessage(
        `Started ${result.started} · ${result.pending} still pending · status ${result.status}`,
      );
      const fresh = await getCampaign(token, campaignId);
      applyCampaign(fresh);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Start failed");
    } finally {
      setBusy(null);
    }
  }

  async function onPause() {
    if (!token || campaignId == null) return;
    setBusy("pause");
    setError(null);
    try {
      const campaign = await pauseCampaign(token, campaignId);
      applyCampaign(campaign);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pause failed");
    } finally {
      setBusy(null);
    }
  }

  async function onResume() {
    if (!token || campaignId == null) return;
    setBusy("resume");
    setError(null);
    try {
      const campaign = await resumeCampaign(token, campaignId);
      applyCampaign(campaign);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Resume failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign</CardTitle>
        <CardDescription>
          A draft can send a test to one address you type. Only a ready campaign can send to its
          list.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Select
            label="Load"
            value={selectedId === "new" ? "new" : String(selectedId)}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "new") {
                setSelectedId("new");
                setCampaignId(null);
                setStatus("draft");
                return;
              }
              void loadCampaign(Number(value));
            }}
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
            label="Sequence"
            value={sequenceType}
            onChange={(e) => setSequenceType(e.target.value)}
            disabled={readOnly}
            className="px-3 py-1.5"
          >
            {types.length === 0 ? <option value="">No templates</option> : null}
            {types.map((t) => (
              <option key={t.sequence_type} value={t.sequence_type}>
                {t.display_name}
              </option>
            ))}
          </Select>
        </div>
        <Textarea
          label="Provenance note"
          value={provenance}
          onChange={(e) => setProvenance(e.target.value)}
          disabled={readOnly}
          hint="Required before ready. How these contact details were obtained."
        />
        <Input
          label="Daily cap"
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
          <Button onClick={() => void onSave()} disabled={!token || readOnly || busy !== null} loading={busy === "save"}>
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
          Pause stops further starts. It does not stop runs already going — use the per-run stop on
          Autonomous Agent for that. Pause is not a kill switch.
        </p>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
          <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">Send test</p>
          <p className="mt-1 text-xs text-amber-900 dark:text-amber-200">
            Using merge data from {currentLabel}. Creates no run, no Offer, and does not touch the
            list. Subject is prefixed with [TEST].
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
            Resolved subject: [TEST] {resolvedSubject || "(empty)"}
          </p>
        </div>

        {rowCounts ? (
          <p className="text-sm font-semibold">
            {rowCounts.rows} rows · {rowCounts.unique_recipients} unique recipients ·{" "}
            {rowCounts.human_only} human only · {rowCounts.test_sends} test sends
          </p>
        ) : null}
        {message ? <p className="text-sm text-emerald-800 dark:text-emerald-200">{message}</p> : null}
        {error ? (
          <p className="text-sm text-red-700 dark:text-red-300" role="alert">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
