"use client";

import {
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import { useSession } from "next-auth/react";
import { Upload } from "lucide-react";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { parseCsv } from "@/lib/csv";
import {
  INTELLIGENCE_SENTINEL,
  MERGE_FIELD_BY_KEY,
  MERGE_FIELDS,
  buildMergeRows,
  classifyToken,
  coverageByToken,
  extractTokens,
  initialColumnMap,
  isFirstNameDerived,
  mappedMergeFields,
  renderTemplate,
  validateTemplate,
} from "@/lib/merge-template";
import {
  allowedFieldsFromMap,
  columnShapeWarnings,
  groupRecipients,
  mappingCounts,
  resolveRecipients,
  type RecipientGroup,
} from "@/lib/campaign-import";
import {
  GCI_FIRST_TOUCH_HTML,
  GCI_FIRST_TOUCH_SUBJECT,
} from "@/lib/campaign-first-touch-example";
import MergeTemplateEditor, {
  type MergeTemplateEditorHandle,
} from "../_components/MergeTemplateEditor";
import {
  CampaignSendCard,
  CampaignSetupCard,
  CampaignSuppressionsCard,
  CampaignWorkspace,
} from "../_components/CampaignControls";

type LastFocus = "subject" | "body";

export default function CampaignPreviewPage() {
  const { data: session } = useSession();
  const token =
    (session as { id_token?: string; accessToken?: string } | null)?.id_token ||
    (session as { accessToken?: string } | null)?.accessToken;
  const userEmail = session?.user?.email || "";
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [subject, setSubject] = useState(GCI_FIRST_TOUCH_SUBJECT);
  const [body, setBody] = useState(GCI_FIRST_TOUCH_HTML);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [recipientPicks, setRecipientPicks] = useState<Record<string, number>>(
    {},
  );
  const [lastFocus, setLastFocus] = useState<LastFocus>("body");
  const [dragging, setDragging] = useState(false);
  const [jumpValue, setJumpValue] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<MergeTemplateEditorHandle>(null);

  const parsed = headers.length > 0 && rawRows.length > 0;

  const mergeRows = useMemo(
    () => (parsed ? buildMergeRows(headers, rawRows, columnMap) : []),
    [parsed, headers, rawRows, columnMap],
  );
  const groups = useMemo(() => groupRecipients(mergeRows), [mergeRows]);
  const recipients = useMemo(
    () => resolveRecipients(mergeRows, groups, recipientPicks),
    [mergeRows, groups, recipientPicks],
  );
  const duplicateGroups = groups.filter(
    (group) => group.sourceIndexes.length > 1,
  );
  const conflictingGroups = duplicateGroups.filter((group) => !group.identical);
  const unresolvedConflicts = conflictingGroups.filter(
    (group) => recipientPicks[group.id] == null,
  );

  const allowed = useMemo(() => allowedFieldsFromMap(columnMap), [columnMap]);
  const tokenFields = useMemo(() => mappedMergeFields(columnMap), [columnMap]);
  const counts = useMemo(() => mappingCounts(columnMap), [columnMap]);
  const shapeWarnings = useMemo(
    () => (parsed ? columnShapeWarnings(headers, rawRows, columnMap) : []),
    [parsed, headers, rawRows, columnMap],
  );
  const derivedFirstName = isFirstNameDerived(columnMap);

  const safeIndex =
    recipients.length === 0 ? 0 : Math.min(previewIndex, recipients.length - 1);
  const current = recipients[safeIndex] ?? null;
  const currentRow = current?.mergeRow ?? {};

  const combinedTemplate = `${subject}\n${body}`;
  const validation = validateTemplate(combinedTemplate, allowed);
  const unknownTokens = validation.ok ? [] : validation.unknown;
  const heldBackTokens = unknownTokens.filter(
    (token) =>
      classifyToken(token, new Set(allowed.map((f) => f.key))) === "held_back",
  );
  const trulyUnknown = unknownTokens.filter(
    (token) =>
      classifyToken(token, new Set(allowed.map((f) => f.key))) === "unknown",
  );

  const subjectRender = renderTemplate(subject, currentRow);
  const bodyRender = renderTemplate(body, currentRow);
  const unresolved = unique([
    ...subjectRender.unresolved,
    ...bodyRender.unresolved,
  ]);

  const coverage = useMemo(
    () =>
      coverageByToken(
        [subject, body],
        recipients.map((r) => r.mergeRow),
        allowed,
      ),
    [subject, body, recipients, allowed],
  );

  const usedTokens = unique(extractTokens(combinedTemplate));

  function resetPreview() {
    setRecipientPicks({});
    setPreviewIndex(0);
    setJumpValue("");
  }

  function acceptFile(file: File | null) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setParseError("Only .csv files are accepted. Nothing was uploaded.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const parsedCsv = parseCsv(text);
      if (parsedCsv.headers.length === 0) {
        setParseError("That file has no header row.");
        return;
      }
      if (parsedCsv.rows.length === 0) {
        setParseError(
          "That file has no data rows — a header-only CSV cannot be previewed.",
        );
        setHeaders([]);
        setRawRows([]);
        setFileName(file.name);
        return;
      }
      setParseError(null);
      setFileName(file.name);
      setHeaders(parsedCsv.headers);
      setRawRows(parsedCsv.rows);
      setColumnMap(initialColumnMap(parsedCsv.headers));
      resetPreview();
    };
    reader.onerror = () =>
      setParseError("Could not read that file in the browser.");
    reader.readAsText(file);
  }

  function setHeaderMapping(header: string, dest: string) {
    setColumnMap((prev) => {
      const next = { ...prev };
      if (dest !== INTELLIGENCE_SENTINEL) {
        for (const [other, currentDest] of Object.entries(next)) {
          if (other !== header && currentDest === dest)
            next[other] = INTELLIGENCE_SENTINEL;
        }
      }
      next[header] = dest;
      return next;
    });
    resetPreview();
  }

  function insertToken(key: string) {
    if (lastFocus === "subject") {
      const token = `{{${key}}}`;
      const el = subjectRef.current;
      if (!el) {
        setSubject((value) => `${value}${token}`);
        return;
      }
      const start = el.selectionStart ?? subject.length;
      const end = el.selectionEnd ?? start;
      const next = subject.slice(0, start) + token + subject.slice(end);
      setSubject(next);
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + token.length;
        el.setSelectionRange(pos, pos);
      });
      return;
    }
    editorRef.current?.insertToken(key);
  }

  function jumpToRecipient() {
    const n = Number.parseInt(jumpValue, 10);
    if (!Number.isFinite(n) || recipients.length === 0) return;
    setPreviewIndex(Math.min(recipients.length, Math.max(1, n)) - 1);
  }

  return (
    <>
      <PageHeader
        pageName="Campaigns"
        title="Campaigns"
        description="Outbound first-touch only. Upload a list, write the email, send yourself a test, then start the list. Comparison follow-ups still start from Base 2 and invoice pages."
      />

      <CampaignWorkspace
        token={token}
        userEmail={userEmail}
        headers={headers}
        rawRows={rawRows}
        columnMap={columnMap}
        subject={subject}
        body={body}
        setSubject={setSubject}
        setBody={setBody}
        setColumnMap={setColumnMap}
        currentMergeRow={currentRow}
        currentLabel={
          current
            ? `Recipient ${safeIndex + 1} of ${recipients.length} — ${current.mergeRow.company_name || current.email || "this row"}`
            : "the selected recipient"
        }
        currentSourceIndex={current?.sourceIndex ?? null}
        parsed={parsed}
      >
      <div className="mt-5 space-y-5">
        <CampaignSetupCard />
        <UploadSection
          fileName={fileName}
          parseError={parseError}
          dragging={dragging}
          setDragging={setDragging}
          fileInputRef={fileInputRef}
          acceptFile={acceptFile}
          parsed={parsed}
          rowCount={rawRows.length}
          headerCount={headers.length}
          uniqueCount={groups.length}
        />

        <MapSection
          enabled={parsed}
          headers={headers}
          rawRows={rawRows}
          columnMap={columnMap}
          setHeaderMapping={setHeaderMapping}
          counts={counts}
          derivedFirstName={derivedFirstName}
          groups={groups}
          duplicateGroups={duplicateGroups}
          unresolvedConflicts={unresolvedConflicts}
          recipientPicks={recipientPicks}
          setRecipientPicks={setRecipientPicks}
          shapeWarnings={shapeWarnings}
        />

        <ComposeSection
          enabled={parsed}
          tokenFields={tokenFields}
          insertToken={insertToken}
          subject={subject}
          setSubject={setSubject}
          subjectRef={subjectRef}
          setLastFocus={setLastFocus}
          body={body}
          setBody={setBody}
          editorRef={editorRef}
          currentRow={currentRow}
          recipientsLength={recipients.length}
          safeIndex={safeIndex}
          setPreviewIndex={setPreviewIndex}
          jumpValue={jumpValue}
          setJumpValue={setJumpValue}
          jumpToRecipient={jumpToRecipient}
          current={current}
          unresolvedConflicts={unresolvedConflicts.length}
          heldBackTokens={heldBackTokens}
          trulyUnknown={trulyUnknown}
          unresolved={unresolved}
          usedTokens={usedTokens}
          coverage={coverage}
        />
        <CampaignSendCard />
        <CampaignSuppressionsCard />
      </div>
      </CampaignWorkspace>
    </>
  );
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function UploadSection({
  fileName,
  parseError,
  dragging,
  setDragging,
  fileInputRef,
  acceptFile,
  parsed,
  rowCount,
  headerCount,
  uniqueCount,
}: {
  fileName: string | null;
  parseError: string | null;
  dragging: boolean;
  setDragging: (value: boolean) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  acceptFile: (file: File | null) => void;
  parsed: boolean;
  rowCount: number;
  headerCount: number;
  uniqueCount: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>2. Upload list</CardTitle>
        <CardDescription>
          Drop a .csv. It is parsed in the browser and is not uploaded until you save the campaign.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "rounded-xl border border-dashed border-gray-300 bg-gray-50/80 p-6 text-center dark:border-gray-600 dark:bg-gray-800/40",
            dragging && "border-primary bg-primary/5",
            parsed && "border-solid border-primary/40",
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            acceptFile(e.dataTransfer.files[0] ?? null);
          }}
        >
          <Upload className="mx-auto mb-2 size-6 text-gray-400" />
          <p className="text-sm font-semibold text-dark dark:text-white">
            Drop a .csv here
          </p>
          <p className="mb-3 mt-1 text-xs text-gray-500">
            Or choose a file. CSV only.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              acceptFile(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
            className="mx-auto block w-full max-w-xs text-xs text-gray-500 file:mr-3 file:rounded-md file:border file:border-gray-200 file:bg-white file:px-3 file:py-1 file:text-xs file:font-medium dark:file:border-gray-600 dark:file:bg-gray-800"
          />
          {fileName ? (
            <p className="mt-2 truncate text-xs text-gray-600 dark:text-gray-400">
              {fileName}
            </p>
          ) : null}
        </div>
        {parseError ? (
          <p
            className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
            role="alert"
          >
            {parseError}
          </p>
        ) : null}
        {parsed ? (
          <p className="mt-3 text-sm font-semibold text-dark dark:text-white">
            {rowCount} rows · {uniqueCount} unique recipients
            <span className="ml-2 font-normal text-gray-500">
              ({headerCount} columns)
            </span>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function MapSection({
  enabled,
  headers,
  rawRows,
  columnMap,
  setHeaderMapping,
  counts,
  derivedFirstName,
  groups,
  duplicateGroups,
  unresolvedConflicts,
  recipientPicks,
  setRecipientPicks,
  shapeWarnings,
}: {
  enabled: boolean;
  headers: string[];
  rawRows: string[][];
  columnMap: Record<string, string>;
  setHeaderMapping: (header: string, dest: string) => void;
  counts: { sent: number; held: number };
  derivedFirstName: boolean;
  groups: RecipientGroup[];
  duplicateGroups: RecipientGroup[];
  unresolvedConflicts: RecipientGroup[];
  recipientPicks: Record<string, number>;
  setRecipientPicks: Dispatch<SetStateAction<Record<string, number>>>;
  shapeWarnings: ReturnType<typeof columnShapeWarnings>;
}) {
  return (
    <Card className={cn(!enabled && "pointer-events-none opacity-50")}>
      <CardHeader>
        <CardTitle>3. Map columns</CardTitle>
        <CardDescription>
          Only mapped fields can appear in the email. Everything else stays as intelligence and is
          never inserted.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {enabled ? (
          <>
            <p className="text-sm font-semibold text-dark dark:text-white">
              {counts.sent} fields will be sent · {counts.held} columns held
              back
            </p>
            <p className="text-sm font-semibold text-dark dark:text-white">
              {rawRows.length} rows · {groups.length} unique recipients
            </p>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-stroke text-xs uppercase tracking-wide text-gray-500 dark:border-dark-3">
                    <th className="py-2 pr-3 font-semibold">Uploaded header</th>
                    <th className="py-2 pr-3 font-semibold">Sample</th>
                    <th className="py-2 font-semibold">Maps to</th>
                  </tr>
                </thead>
                <tbody>
                  {headers.map((header) => (
                    <tr
                      key={header}
                      className="border-b border-stroke/70 dark:border-dark-3/70"
                    >
                      <td className="py-2 pr-3 font-medium text-dark dark:text-white">
                        {header}
                      </td>
                      <td className="max-w-[16rem] truncate py-2 pr-3 text-xs text-gray-500">
                        {sampleValue(rawRows, headers.indexOf(header))}
                      </td>
                      <td className="py-2">
                        <Select
                          value={columnMap[header] ?? INTELLIGENCE_SENTINEL}
                          onChange={(e) =>
                            setHeaderMapping(header, e.target.value)
                          }
                          className="px-3 py-1.5"
                        >
                          <option value={INTELLIGENCE_SENTINEL}>
                            Intelligence — do not send
                          </option>
                          {MERGE_FIELDS.map((field) => (
                            <option key={field.key} value={field.key}>
                              {field.label} ({field.key})
                            </option>
                          ))}
                        </Select>
                      </td>
                    </tr>
                  ))}
                  {derivedFirstName ? (
                    <tr className="border-b border-stroke/70 bg-gray-50/80 dark:border-dark-3/70 dark:bg-gray-800/40">
                      <td className="py-2 pr-3 font-medium text-dark dark:text-white">
                        first_name
                        <Badge intent="info" className="ml-2">
                          derived
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 text-xs text-gray-500">
                        First token of contact name
                      </td>
                      <td className="py-2 text-sm text-gray-600 dark:text-gray-300">
                        First name — derived from contact_name
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {shapeWarnings.length > 0 ? (
              <div className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                {shapeWarnings.map((warning) => (
                  <p key={warning.key}>
                    {warning.label} does not look like the right shape in{" "}
                    {warning.total - warning.okCount} of {warning.total} rows (
                    {Math.round(warning.okFraction * 100)}% match). Check for a
                    shifted column.
                  </p>
                ))}
              </div>
            ) : null}

            {duplicateGroups.length > 0 ? (
              <div className="space-y-3 rounded-xl border border-stroke p-4 dark:border-dark-3">
                <p className="text-sm font-semibold text-dark dark:text-white">
                  Duplicate emails — grouped, not dropped
                </p>
                <p className="text-xs text-gray-500">
                  {duplicateGroups.length} addresses appear more than once.
                  Identical groups collapse to one recipient. Conflicting groups
                  need you to pick a row.
                </p>
                <ul className="space-y-3">
                  {duplicateGroups.map((group) => (
                    <li key={group.id} className="text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-dark dark:text-white">
                          {group.email ?? "(no email)"}
                        </span>
                        <Badge intent={group.identical ? "neutral" : "warning"}>
                          {group.sourceIndexes.length} rows
                          {group.identical
                            ? " · identical"
                            : " · fields differ"}
                        </Badge>
                      </div>
                      {!group.identical ? (
                        <div className="mt-2 space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-2 dark:border-amber-900/50 dark:bg-amber-950/30">
                          <p className="text-xs text-amber-900 dark:text-amber-100">
                            Mapped fields differ (
                            {group.differingKeys.join(", ")}). Pick the row that
                            represents this recipient — nothing is chosen
                            automatically.
                          </p>
                          {group.sourceIndexes.map((index) => (
                            <label
                              key={index}
                              className="flex items-start gap-2 text-xs"
                            >
                              <input
                                type="radio"
                                name={group.id}
                                checked={recipientPicks[group.id] === index}
                                onChange={() =>
                                  setRecipientPicks((prev) => ({
                                    ...prev,
                                    [group.id]: index,
                                  }))
                                }
                                className="mt-0.5"
                              />
                              <span>
                                Row {index + 1}:{" "}
                                {summariseRow(
                                  rawRows[index],
                                  headers,
                                  columnMap,
                                )}
                              </span>
                            </label>
                          ))}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {unresolvedConflicts.length > 0 ? (
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                    {unresolvedConflicts.length} recipient
                    {unresolvedConflicts.length === 1 ? "" : "s"} need a row
                    choice before they appear in the preview stepper.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                No duplicate emails. {groups.length} rows · {groups.length}{" "}
                unique recipients.
              </p>
            )}
          </>
        ) : (
          <EmptyState
            title="Upload a CSV first"
            description="Column mapping lights up after a file parses."
          />
        )}
      </CardContent>
    </Card>
  );
}

function ComposeSection({
  enabled,
  tokenFields,
  insertToken,
  subject,
  setSubject,
  subjectRef,
  setLastFocus,
  body,
  setBody,
  editorRef,
  currentRow,
  recipientsLength,
  safeIndex,
  setPreviewIndex,
  jumpValue,
  setJumpValue,
  jumpToRecipient,
  current,
  unresolvedConflicts,
  heldBackTokens,
  trulyUnknown,
  unresolved,
  usedTokens,
  coverage,
}: {
  enabled: boolean;
  tokenFields: ReturnType<typeof mappedMergeFields>;
  insertToken: (key: string) => void;
  subject: string;
  setSubject: (value: string) => void;
  subjectRef: RefObject<HTMLInputElement | null>;
  setLastFocus: (value: LastFocus) => void;
  body: string;
  setBody: (value: string) => void;
  editorRef: RefObject<MergeTemplateEditorHandle | null>;
  currentRow: Record<string, string>;
  recipientsLength: number;
  safeIndex: number;
  setPreviewIndex: (value: number) => void;
  jumpValue: string;
  setJumpValue: (value: string) => void;
  jumpToRecipient: () => void;
  current: ReturnType<typeof resolveRecipients>[number] | null;
  unresolvedConflicts: number;
  heldBackTokens: string[];
  trulyUnknown: string[];
  unresolved: string[];
  usedTokens: string[];
  coverage: ReturnType<typeof coverageByToken>;
}) {
  return (
    <Card className={cn(!enabled && "pointer-events-none opacity-50")}>
      <CardHeader>
        <CardTitle>4. Write the first email</CardTitle>
        <CardDescription>
          Preview walks unique recipients, not duplicate rows. Insert merge fields from the mapped
          columns only.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {enabled ? (
          <>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Token picker
              </p>
              {tokenFields.length === 0 ? (
                <p className="text-xs text-gray-500">
                  Map at least one column to a merge field to insert tokens.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {tokenFields.map((field) => (
                    <button
                      key={field.key}
                      type="button"
                      onClick={() => insertToken(field.key)}
                      className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200"
                    >
                      {`{{${field.key}}}`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Input
              ref={subjectRef}
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onFocus={() => setLastFocus("subject")}
              placeholder="2027-2029 gas allocation — recent invoices for review"
              className="px-3 py-2"
            />

            <MergeTemplateEditor
              ref={editorRef}
              value={body}
              onChange={setBody}
              row={currentRow}
              onFocus={() => setLastFocus("body")}
            />

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={safeIndex <= 0}
                onClick={() => setPreviewIndex(Math.max(0, safeIndex - 1))}
                aria-label="Previous recipient"
              >
                ‹
              </Button>
              <span className="text-sm font-semibold text-dark dark:text-white">
                Recipient {recipientsLength === 0 ? 0 : safeIndex + 1} of{" "}
                {recipientsLength}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={safeIndex >= recipientsLength - 1}
                onClick={() =>
                  setPreviewIndex(Math.min(recipientsLength - 1, safeIndex + 1))
                }
                aria-label="Next recipient"
              >
                ›
              </Button>
              <Input
                type="number"
                min={1}
                max={Math.max(1, recipientsLength)}
                value={jumpValue}
                onChange={(e) => setJumpValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") jumpToRecipient();
                }}
                placeholder="Jump"
                className="w-24 px-2 py-1.5"
                wrapperClassName="w-24"
              />
              <Button variant="ghost" size="sm" onClick={jumpToRecipient}>
                Go
              </Button>
              {current?.duplicateCount && current.duplicateCount > 1 ? (
                <span className="text-xs text-gray-500">
                  {current.duplicateCount} source rows · previewing row{" "}
                  {current.sourceIndex + 1}
                </span>
              ) : null}
            </div>
            {current?.email ? (
              <p className="text-xs text-gray-500">{current.email}</p>
            ) : null}
            {unresolvedConflicts > 0 ? (
              <p className="text-xs text-amber-800 dark:text-amber-200">
                {unresolvedConflicts} conflicting duplicate
                {unresolvedConflicts === 1 ? "" : "s"} excluded until you pick a
                row above.
              </p>
            ) : null}

            {heldBackTokens.length > 0 ? (
              <div
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
                role="alert"
              >
                {heldBackTokens.map((token) => (
                  <p key={token}>
                    {`{{${token}}}`} is held back for this campaign
                  </p>
                ))}
              </div>
            ) : null}
            {trulyUnknown.length > 0 ? (
              <div
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
                role="alert"
              >
                Unknown token{trulyUnknown.length === 1 ? "" : "s"}:{" "}
                {trulyUnknown.map((token) => `{{${token}}}`).join(", ")}
              </div>
            ) : null}
            {unresolved.length > 0 && current ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                {unresolved.map((token) => (
                  <p key={token}>
                    this row has no `{MERGE_FIELD_BY_KEY[token]?.label ?? token}
                    `
                  </p>
                ))}
              </div>
            ) : null}

            {usedTokens.length > 0 ? (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Coverage across unique recipients
                </p>
                <ul className="space-y-1 text-sm">
                  {coverage.map((item) => (
                    <li key={item.key} className="text-dark dark:text-white">
                      <span className="font-semibold">
                        {item.emptyCount} of {item.total}
                      </span>{" "}
                      recipients have no {item.label.toLowerCase()}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                Insert tokens to see coverage across unique recipients.
              </p>
            )}
          </>
        ) : (
          <EmptyState
            title="Compose after upload"
            description="Subject, body and live preview unlock once a CSV has parsed."
          />
        )}
      </CardContent>
    </Card>
  );
}

function sampleValue(rows: string[][], index: number): string {
  for (const row of rows) {
    const value = (row[index] ?? "").trim();
    if (value) return value;
  }
  return "—";
}

function summariseRow(
  cells: string[] | undefined,
  headers: string[],
  columnMap: Record<string, string>,
): string {
  if (!cells) return "";
  const parts: string[] = [];
  for (let i = 0; i < headers.length; i++) {
    const dest = columnMap[headers[i]];
    if (!dest || dest === INTELLIGENCE_SENTINEL) continue;
    const value = (cells[i] ?? "").trim();
    if (value) parts.push(`${dest}=${value}`);
  }
  return parts.join(" · ") || `source row`;
}
