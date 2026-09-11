"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { ToolPageLayout } from "@/components/Layouts/ToolPageLayout";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import {
  createEmailRecipient,
  deactivateEmailRecipient,
  fetchEmailRecipients,
  fetchEmailTemplates,
  patchEmailRecipient,
  patchEmailTemplate,
  type OperationalEmailRecipient,
  type OperationalEmailTemplate,
} from "@/lib/operational-email-api";
import { HtmlTemplateEditor } from "./_components/HtmlTemplateEditor";
import { RecipientLists } from "./_components/RecipientLists";

const CATEGORY_LABELS: Record<string, string> = {
  data_request: "Data requests",
  quote_request: "Quote requests",
  signed_agreement: "Signed agreement lodgement",
  alinta_gas: "Alinta gas agreement",
  share_folder: "Shared folder",
};

type MainTab = "templates" | "recipients";

export default function EmailTemplatesPage() {
  const { data: session } = useSession();
  const token =
    (session as { id_token?: string; accessToken?: string } | null)?.id_token ??
    (session as { accessToken?: string } | null)?.accessToken ??
    "";
  const { showToast } = useToast();
  const [tab, setTab] = useState<MainTab>("templates");
  const [templates, setTemplates] = useState<OperationalEmailTemplate[]>([]);
  const [recipients, setRecipients] = useState<OperationalEmailRecipient[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingRecipientId, setSavingRecipientId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = templates.find((row) => row.key === selectedKey) ?? templates[0];
  const dirty = Boolean(selected && (subject !== selected.subject || html !== selected.html_body));

  const groupedTemplates = useMemo(() => {
    const groups = new Map<string, OperationalEmailTemplate[]>();
    for (const row of templates) {
      const list = groups.get(row.category) ?? [];
      list.push(row);
      groups.set(row.category, list);
    }
    return Array.from(groups.entries());
  }, [templates]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [templateRes, recipientRes] = await Promise.all([
        fetchEmailTemplates(token),
        fetchEmailRecipients(token),
      ]);
      setTemplates(templateRes.templates);
      setRecipients(recipientRes.recipients);
      setSelectedKey((current) => current || templateRes.templates[0]?.key || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load email templates");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selected) return;
    setSubject(selected.subject);
    setHtml(selected.html_body);
  }, [selected?.key, selected?.subject, selected?.html_body]);

  async function handleSaveTemplate() {
    if (!selected || !token) return;
    setSaving(true);
    try {
      const updated = await patchEmailTemplate(token, selected.key, { subject, html_body: html });
      setTemplates((prev) => prev.map((row) => (row.key === updated.key ? updated : row)));
      showToast("Template saved. New sends will use this copy.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not save template", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveRecipient(
    id: number,
    emails: string[],
    extras: Partial<OperationalEmailRecipient>,
  ) {
    if (!token) return;
    setSavingRecipientId(id);
    try {
      const updated = await patchEmailRecipient(token, id, {
        emails,
        is_placeholder: extras.is_placeholder,
      });
      setRecipients((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      showToast("Recipient list updated.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not save recipients", "error");
    } finally {
      setSavingRecipientId(null);
    }
  }

  async function handleCreateRecipient(body: {
    flow: string;
    key: string;
    display_name: string;
    emails: string[];
    group_name: string;
    is_placeholder: boolean;
  }) {
    if (!token) return;
    try {
      const created = await createEmailRecipient(token, body);
      setRecipients((prev) => [...prev, created]);
      showToast("Recipient list added. It will be used on the next send.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not add recipient list", "error");
    }
  }

  async function handleDeactivate(id: number) {
    if (!token) return;
    setSavingRecipientId(id);
    try {
      const updated = await deactivateEmailRecipient(token, id);
      setRecipients((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      showToast("Recipient list removed from future sends.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not remove recipient list", "error");
    } finally {
      setSavingRecipientId(null);
    }
  }

  return (
    <ToolPageLayout
      pageName="Email Templates"
      title="Email templates"
      description="Edit the emails sent for data requests, quote requests, and signed agreement lodgement. Changes apply going forward."
      width="full"
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {(["templates", "recipients"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              tab === id
                ? "bg-primary text-white"
                : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            }`}
          >
            {id === "templates" ? "Email copy" : "Who receives them"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner className="size-8 text-primary" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : tab === "templates" ? (
        <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <Card className="h-fit p-3">
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Templates</p>
            <div className="space-y-3">
              {groupedTemplates.map(([category, rows]) => (
                <div key={category}>
                  <p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    {CATEGORY_LABELS[category] || category}
                  </p>
                  <div className="mt-1 space-y-1">
                    {rows.map((row) => (
                      <button
                        key={row.key}
                        type="button"
                        onClick={() => setSelectedKey(row.key)}
                        className={`block w-full rounded-lg px-2 py-1.5 text-left text-sm ${
                          selected?.key === row.key
                            ? "bg-primary/10 font-medium text-primary"
                            : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                        }`}
                      >
                        {row.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            {selected ? (
              <HtmlTemplateEditor
                template={selected}
                subject={subject}
                html={html}
                onSubjectChange={setSubject}
                onHtmlChange={setHtml}
                onSave={() => void handleSaveTemplate()}
                saving={saving}
                dirty={dirty}
              />
            ) : (
              <p className="text-sm text-gray-500">No templates found.</p>
            )}
          </Card>
        </div>
      ) : (
        <Card>
          <RecipientLists
            recipients={recipients}
            onSave={handleSaveRecipient}
            onCreate={handleCreateRecipient}
            onDeactivate={handleDeactivate}
            savingId={savingRecipientId}
          />
        </Card>
      )}
    </ToolPageLayout>
  );
}
