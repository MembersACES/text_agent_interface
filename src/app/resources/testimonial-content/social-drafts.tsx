"use client";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { formatDateAustralian } from "@/lib/utils";
import { isApprovedTestimonial, typeLabel, type ExampleItem } from "./records-panel";

export type SocialDraftFile = {
  file_id: string;
  file_name: string;
  file_url: string;
  modified_time?: string | null;
  text: string;
  read_error?: string | null;
};

export type SocialDraftMatch = SocialDraftFile & {
  testimonial_id: number;
  business_name: string;
};

export type SocialDraftsPayload = {
  folder_url: string;
  guide: SocialDraftFile | null;
  drafts: SocialDraftMatch[];
  unlinked: SocialDraftFile[];
  error: string | null;
};

function isMatch(draft: SocialDraftFile | SocialDraftMatch): draft is SocialDraftMatch {
  return "testimonial_id" in draft && typeof draft.testimonial_id === "number";
}

export function SocialDraftsNotice({
  loading,
  loadError,
  payload,
  onRetry,
  onOpenFile,
}: {
  loading: boolean;
  loadError: string | null;
  payload: SocialDraftsPayload | null;
  onRetry: () => void;
  onOpenFile: (file: SocialDraftFile) => void;
}) {
  if (loading && !payload) {
    return <p className="text-xs text-gray-500">Checking the LinkedIn folder…</p>;
  }

  const message = payload?.error || loadError;
  if (message) {
    return (
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
        <p>{message}</p>
        <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }

  if (!payload) return null;
  const count = payload.drafts.length;
  const unlinked = payload.unlinked;
  if (count === 0 && unlinked.length === 0 && !payload.guide) return null;

  return (
    <div className="space-y-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-dark">
      {count > 0 ? (
        <p className="text-gray-700 dark:text-gray-200">
          <span className="font-semibold">
            {count} LinkedIn draft{count === 1 ? "" : "s"}
          </span>{" "}
          ready to review. Open <span className="font-semibold">View draft</span> on the row.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {payload.guide ? (
          <a
            href={payload.guide.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary hover:underline"
          >
            LinkedIn post guide
          </a>
        ) : null}
        {payload.folder_url ? (
          <a
            href={payload.folder_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-gray-500 hover:text-primary"
          >
            Drive folder
          </a>
        ) : null}
      </div>
      {unlinked.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="text-xs">
            {unlinked.length} file{unlinked.length === 1 ? "" : "s"} in the folder didn’t match a member. The file
            name needs to line up with the business name.
          </p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {unlinked.map((file) => (
              <button
                key={file.file_id}
                type="button"
                onClick={() => onOpenFile(file)}
                className="text-xs font-semibold text-primary hover:underline"
              >
                {file.file_name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SocialDraftModal({
  draft,
  row,
  approving,
  onClose,
  onApprove,
}: {
  draft: SocialDraftFile | SocialDraftMatch | null;
  row: ExampleItem | null;
  approving: boolean;
  onClose: () => void;
  onApprove: () => void;
}) {
  const matched = draft && isMatch(draft) ? draft : null;
  const approved = row ? isApprovedTestimonial(row) : false;
  const socialStatus = (row?.social_status || "").trim();
  const alreadyReady = socialStatus === "Ready to post" || socialStatus === "Posted";
  const approveLabel =
    socialStatus === "Posted" ? "Posted" : socialStatus === "Ready to post" ? "Ready to post" : "Approve";
  const updated = draft?.modified_time ? formatDateAustralian(draft.modified_time) : "";
  const context = [row ? typeLabel(row) : "", row?.testimonial_savings?.trim() || ""]
    .filter(Boolean)
    .join(" · ");

  return (
    <Modal
      open={draft !== null}
      onClose={onClose}
      title={matched?.business_name || draft?.file_name || "LinkedIn draft"}
      size="lg"
      id="social-draft"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          {draft ? (
            <a
              href={draft.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-primary hover:underline"
            >
              Edit in Drive
            </a>
          ) : (
            <span />
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Close
            </Button>
            {matched && approved ? (
              <Button type="button" onClick={onApprove} loading={approving} disabled={approving || alreadyReady}>
                {approveLabel}
              </Button>
            ) : null}
          </div>
        </div>
      }
    >
      {draft ? (
        <div className="space-y-3">
          {context ? <p className="text-xs text-gray-500">{context}</p> : null}
          {updated ? <p className="text-xs text-gray-400">Updated in Drive {updated}</p> : null}
          {matched && row && !approved ? (
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              Approve the testimonial before this post can be marked ready.
            </p>
          ) : null}
          {!matched ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
              This file isn’t linked to a member row. Rename it so it matches the business, then refresh.
            </p>
          ) : null}
          {draft.read_error ? (
            <p className="text-sm text-amber-800 dark:text-amber-200">{draft.read_error}</p>
          ) : (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-gray-100">
              {draft.text || "This draft is empty."}
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
