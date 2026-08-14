"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { ExternalLink, FolderOpen, Share2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { fetchMemberWip, parseAdditionalDocuments, type MemberSimpleDoc } from "@/lib/member-documents-api";
import {
  fetchShareFolderStatus,
  isShareEmailValid,
  parseShareEmails,
  roleLabel,
  shareMemberFolder,
  type ShareFolderResult,
  type ShareFolderStatus,
} from "@/lib/share-folder-api";
import { cn } from "@/lib/utils";

type Step = "files" | "email" | "done";

export function SharedFolderStatusCard({
  driveUrl,
  refreshKey = 0,
  onManage,
  compact = false,
}: {
  driveUrl?: string | null;
  refreshKey?: number;
  onManage?: () => void;
  compact?: boolean;
}) {
  const { data: session } = useSession();
  const token =
    (session as { id_token?: string; accessToken?: string } | null)?.id_token ??
    (session as { id_token?: string; accessToken?: string } | null)?.accessToken ??
    "";
  const [status, setStatus] = useState<ShareFolderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!driveUrl || !token) return;
    let cancelled = false;
    const apply = (data: ShareFolderStatus) => {
      if (!cancelled) setStatus(data);
    };
    const fail = (err: unknown) => {
      if (!cancelled) setError(err instanceof Error ? err.message : "Could not load shared folder.");
    };
    const done = () => {
      if (!cancelled) setLoading(false);
    };
    void fetchShareFolderStatus(driveUrl, token).then(apply).catch(fail).finally(done);
    const onUpdated = () => {
      void fetchShareFolderStatus(driveUrl, token).then(apply).catch(fail);
    };
    window.addEventListener("share-folder-updated", onUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener("share-folder-updated", onUpdated);
    };
  }, [driveUrl, token, refreshKey]);

  if (!driveUrl) return null;

  const fileCount = status?.files.length ?? 0;
  const people = status?.shared_with ?? [];

  return (
    <Card className={cn("overflow-hidden p-0 sm:p-0", compact && "shadow-none")}>
      <div className={cn("flex flex-col gap-3", compact ? "px-3 py-3" : "px-5 py-4")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Shared with client</p>
            {loading ? (
              <p className="mt-1 text-xs text-gray-400">Checking Drive…</p>
            ) : error ? (
              <p className="mt-1 text-xs text-red-600">{error}</p>
            ) : !status?.exists ? (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Nothing shared yet.</p>
            ) : (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {fileCount} file{fileCount === 1 ? "" : "s"}
                {people.length > 0
                  ? ` · ${people.map((p) => p.email).join(", ")}`
                  : " · no client email on the folder yet"}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {status?.folder_url ? (
              <a
                href={status.folder_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Open
                <ExternalLink className="size-3" aria-hidden />
              </a>
            ) : null}
            {onManage ? (
              <Button type="button" variant="secondary" size="sm" radius="md" onClick={onManage}>
                {status?.exists ? "Manage" : "Share"}
              </Button>
            ) : null}
          </div>
        </div>
        {status?.exists && !compact ? (
          <div className="space-y-2">
            {people.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {people.map((person) => (
                  <Badge key={`${person.email}-${person.role}`} intent="info" shape="pill" className="text-[10px]">
                    {person.email} · {roleLabel(person.role)}
                  </Badge>
                ))}
              </div>
            ) : null}
            {status.files.length > 0 ? (
              <ul className="space-y-1">
                {status.files.map((file) => (
                  <li key={file.id} className="truncate text-xs text-gray-600 dark:text-gray-300">
                    {file.web_view_link ? (
                      <a
                        href={file.web_view_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary hover:underline"
                      >
                        {file.name}
                      </a>
                    ) : (
                      file.name
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-400">Folder exists but has no files yet.</p>
            )}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export function ShareFolderModal({
  open,
  onClose,
  driveUrl,
  businessName,
  defaultEmail,
  onShared,
}: {
  open: boolean;
  onClose: () => void;
  driveUrl: string;
  businessName: string;
  defaultEmail: string;
  onShared?: () => void;
}) {
  if (!open) return null;
  return (
    <ShareFolderModalInner
      onClose={onClose}
      driveUrl={driveUrl}
      businessName={businessName}
      defaultEmail={defaultEmail}
      onShared={onShared}
    />
  );
}

function ShareFolderModalInner({
  onClose,
  driveUrl,
  businessName,
  defaultEmail,
  onShared,
}: {
  onClose: () => void;
  driveUrl: string;
  businessName: string;
  defaultEmail: string;
  onShared?: () => void;
}) {
  const { data: session } = useSession();
  const token =
    (session as { id_token?: string; accessToken?: string } | null)?.id_token ??
    (session as { id_token?: string; accessToken?: string } | null)?.accessToken ??
    "";
  const { showToast } = useToast();
  const authError =
    !driveUrl || !token ? "Sign in and a member Drive folder are required." : null;

  const [step, setStep] = useState<Step>("files");
  const [loading, setLoading] = useState(() => Boolean(driveUrl && token));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ShareFolderStatus | null>(null);
  const [additionalDocs, setAdditionalDocs] = useState<MemberSimpleDoc[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [email, setEmail] = useState(defaultEmail);
  const [sendNotification, setSendNotification] = useState(true);
  const [result, setResult] = useState<ShareFolderResult | null>(null);

  useEffect(() => {
    if (!driveUrl || !token) return;
    let cancelled = false;
    void Promise.all([
      fetchShareFolderStatus(driveUrl, token),
      businessName ? fetchMemberWip(businessName, token) : Promise.resolve(null),
    ])
      .then(([shareStatus, wip]) => {
        if (cancelled) return;
        setStatus(shareStatus);
        setAdditionalDocs(parseAdditionalDocuments(wip));
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load share details.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [driveUrl, token, businessName]);

  const alreadySharedNames = useMemo(() => {
    const names = new Set<string>();
    for (const file of status?.files ?? []) {
      names.add(file.name.trim().toLowerCase());
    }
    return names;
  }, [status?.files]);

  const selectableDocs = additionalDocs.filter((doc) => doc.id);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggleDoc = (id: string, disabled: boolean) => {
    if (disabled) return;
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const canContinue = selectedIds.length > 0 || Boolean(status?.exists);

  const handleShare = async () => {
    const emails = parseShareEmails(email);
    const invalid = emails.filter((item) => !isShareEmailValid(item));
    if (emails.length === 0 || invalid.length > 0) {
      setError(
        invalid.length > 0
          ? `Not a valid email: ${invalid.join(", ")}`
          : "Enter one or more email addresses, separated by commas.",
      );
      return;
    }
    if (!token) {
      setError("Please sign in.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const emailList = emails.join(", ");
    try {
      const payload = await shareMemberFolder({
        gdriveUrl: driveUrl,
        fileIds: selectedIds,
        email: emailList,
        sendNotification,
        businessName,
        token,
      });
      setResult(payload);
      setStatus(payload);
      setStep("done");
      const added = (payload.copy_results || []).filter(
        (row) => row.action === "copied" || row.action === "shortcut",
      ).length;
      showToast(
        added > 0
          ? `Shared ${added} file${added === 1 ? "" : "s"} with ${emailList}.`
          : `Shared folder with ${emailList}.`,
        "success",
      );
      onShared?.();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("share-folder-updated"));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Share failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const close = () => {
    if (submitting) return;
    onClose();
  };

  const title =
    step === "email" ? "Who should get access?" : step === "done" ? "Shared folder ready" : "Share Folder / File";

  return (
    <Modal
      open
      onClose={close}
      title={title}
      size="lg"
      id="share-folder-modal"
      footer={
        step === "done" ? (
          <div className="flex justify-end">
            <Button type="button" variant="primary" size="sm" radius="md" onClick={close}>
              Done
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="ghost" size="sm" radius="md" onClick={close} disabled={submitting}>
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              {step === "email" ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  radius="md"
                  onClick={() => {
                    setError(null);
                    setStep("files");
                  }}
                  disabled={submitting}
                >
                  Back
                </Button>
              ) : null}
              {step === "files" ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  radius="md"
                  onClick={() => {
                    setError(null);
                    setStep("email");
                  }}
                  disabled={loading || !canContinue}
                >
                  Continue
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  radius="md"
                  onClick={() => void handleShare()}
                  disabled={submitting || loading}
                  loading={submitting}
                  leftIcon={<Share2 className="size-3.5" aria-hidden />}
                >
                  {submitting ? "Sharing…" : "Share folder"}
                </Button>
              )}
            </div>
          </div>
        )
      }
    >
      {loading ? (
        <p className="text-sm text-gray-500">Loading Additional Documents and current shares…</p>
      ) : (
        <div className="space-y-4">
          {error || authError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400">
              {error || authError}
            </p>
          ) : null}

          {step === "files" ? (
            <>
              {status?.exists ? (
                <div className="rounded-lg border border-stroke/70 bg-gray-50 px-3 py-2.5 dark:border-dark-3 dark:bg-dark-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-100">
                    <FolderOpen className="size-4 text-primary" aria-hidden />
                    Shared Folder already exists
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {status.files.length} file{status.files.length === 1 ? "" : "s"} currently in the pack
                    {status.shared_with.length > 0
                      ? ` · shared with ${status.shared_with.map((p) => p.email).join(", ")}`
                      : ""}
                    .
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  This creates a <span className="font-medium">Shared Folder</span> in the member Drive folder, copies
                  the selected Additional Documents into it, then shares only that folder.
                </p>
              )}

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Additional Documents
                </p>
                {selectableDocs.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    No additional documents found. Upload files in Additional Documents first, or continue to share the
                    existing folder with someone.
                  </p>
                ) : (
                  <ul className="max-h-56 space-y-1.5 overflow-y-auto">
                    {selectableDocs.map((doc) => {
                      const already = alreadySharedNames.has(doc.fileName.trim().toLowerCase());
                      const checked = already || selectedSet.has(doc.id);
                      return (
                        <li key={doc.id}>
                          <label
                            className={cn(
                              "flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm",
                              already
                                ? "border-stroke/60 bg-gray-50 text-gray-400 dark:border-dark-3 dark:bg-dark-2"
                                : checked
                                  ? "border-primary/40 bg-primary/5"
                                  : "border-stroke hover:bg-gray-50 dark:border-dark-3 dark:hover:bg-dark-2",
                            )}
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5 accent-primary"
                              checked={checked}
                              disabled={already}
                              onChange={() => toggleDoc(doc.id, already)}
                            />
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-gray-800 dark:text-gray-100">
                                {doc.fileName}
                              </span>
                              {already ? (
                                <span className="text-[11px] text-gray-400">Already in Shared Folder</span>
                              ) : null}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          ) : null}

          {step === "email" ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Pre-filled from the LOA contact email. Add more addresses separated by commas if you need to share with
                more than one person.
              </p>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Share with
                </span>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@example.com, other@example.com"
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
              </label>
              <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-primary"
                  checked={sendNotification}
                  onChange={(e) => setSendNotification(e.target.checked)}
                />
                <span>Email these people a Carbon Zero message with the folder link</span>
              </label>
              {sendNotification ? (
                <div className="rounded-lg border border-stroke/70 bg-gray-50 p-3 dark:border-dark-3 dark:bg-dark-2">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Email preview
                  </p>
                  <p className="mb-2 text-xs font-medium text-gray-700 dark:text-gray-200">
                    Subject: Carbon Zero Australasia has shared documents with you
                    {businessName ? ` — ${businessName}` : ""}
                  </p>
                  <div className="space-y-2 rounded-md bg-white p-3 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-200">
                    <p>Hello,</p>
                    <p>
                      Carbon Zero Australasia has shared documents with you
                      {businessName ? ` for ${businessName}` : ""}. Open the folder using the button in the email
                      (Google account required).
                    </p>
                    <p className="font-medium text-primary">Open shared documents</p>
                    {selectedIds.length > 0 ? (
                      <p>
                        {selectedIds.length} file{selectedIds.length === 1 ? "" : "s"} will be listed in the email.
                      </p>
                    ) : null}
                    <p>
                      Kind regards,
                      <br />
                      {session?.user?.name || "Carbon Zero Australasia"}
                      {session?.user?.email ? (
                        <>
                          <br />
                          {session.user.email}
                        </>
                      ) : null}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400">
                  Drive access will still be granted. No email will be sent — you can share the folder link yourself.
                </p>
              )}
              <p className="text-xs text-gray-400">
                They get Viewer access to Shared Folder only — not the rest of the member Drive. Each person needs a
                Google account on that email to open it.
              </p>
              {selectedIds.length > 0 ? (
                <p className="text-xs text-gray-500">
                  {selectedIds.length} file{selectedIds.length === 1 ? "" : "s"} will be added to Shared Folder.
                </p>
              ) : (
                <p className="text-xs text-gray-500">No new files selected — this will share the existing folder.</p>
              )}
            </div>
          ) : null}

          {step === "done" && result ? (
            <div className="space-y-3">
              {result.folder_url ? (
                <a
                  href={result.folder_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  Open Shared Folder
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
              ) : null}
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Shared as Viewer with{" "}
                {(result.permissions || []).map((item) => item.email).filter(Boolean).join(", ") ||
                  result.permission?.email ||
                  email.trim()}
                .
              </p>
              {(result.copy_results || []).length > 0 ? (
                <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                  {(result.copy_results || []).map((row) => (
                    <li key={`${row.file_id}-${row.action}`}>
                      {row.name || row.file_id}:{" "}
                      {row.action === "copied"
                        ? "copied"
                        : row.action === "shortcut"
                          ? "added to Shared Folder"
                          : row.action === "already_present"
                            ? "already in folder"
                            : row.error || "failed"}
                    </li>
                  ))}
                </ul>
              ) : null}
              {result.copy_failures && result.copy_failures.length > 0 ? (
                <p className="text-xs text-amber-700">
                  Some files could not be copied. The folder was still shared.
                </p>
              ) : null}
              {result.email_results && result.email_results.length > 0 ? (
                <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                  {result.email_results.map((row) => (
                    <li key={row.email}>
                      Email to {row.email}: {row.action === "sent" ? "sent" : row.error || "failed"}
                    </li>
                  ))}
                </ul>
              ) : sendNotification ? (
                <p className="text-xs text-gray-400">No branded email was sent.</p>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
