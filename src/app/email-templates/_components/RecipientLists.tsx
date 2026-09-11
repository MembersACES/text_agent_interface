"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { OperationalEmailRecipient } from "@/lib/operational-email-api";

const FLOW_LABELS: Record<string, string> = {
  signed_contract: "Signed contracts",
  eoi: "EOIs",
  data_request: "Data requests",
  quote_request: "Quote requests",
  alinta_gas: "Alinta gas agreement",
};

type RecipientListsProps = {
  recipients: OperationalEmailRecipient[];
  onSave: (id: number, emails: string[], extras: Partial<OperationalEmailRecipient>) => Promise<void>;
  onCreate: (body: {
    flow: string;
    key: string;
    display_name: string;
    emails: string[];
    group_name: string;
    is_placeholder: boolean;
  }) => Promise<void>;
  onDeactivate: (id: number) => Promise<void>;
  savingId: number | null;
};

function parseEmails(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function RecipientLists({
  recipients,
  onSave,
  onCreate,
  onDeactivate,
  savingId,
}: RecipientListsProps) {
  const flows = useMemo(() => {
    const present = Array.from(new Set(recipients.map((row) => row.flow)));
    const order = Object.keys(FLOW_LABELS);
    return [...order.filter((flow) => present.includes(flow)), ...present.filter((flow) => !order.includes(flow))];
  }, [recipients]);
  const [flow, setFlow] = useState(flows[0] || "signed_contract");
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [newKey, setNewKey] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmails, setNewEmails] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const [newPlaceholder, setNewPlaceholder] = useState(false);

  const rows = recipients.filter((row) => row.flow === flow && row.is_active);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {flows.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setFlow(id)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              flow === id
                ? "bg-primary text-white"
                : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            }`}
          >
            {FLOW_LABELS[id] || id}
          </button>
        ))}
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        Add or remove addresses for each supplier. Changes apply to the next email sent.
      </p>

      <div className="space-y-3">
        {rows.map((row) => {
          const value = drafts[row.id] ?? row.emails.join(", ");
          const dirty = value !== row.emails.join(", ");
          return (
            <div
              key={row.id}
              className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-dark"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-dark dark:text-white">{row.key}</p>
                  <p className="text-xs text-gray-500">
                    {row.display_name}
                    {row.group_name ? ` · ${row.group_name}` : ""}
                    {row.updated_by ? ` · updated by ${row.updated_by}` : ""}
                    {row.updated_at ? ` · ${new Date(row.updated_at).toLocaleString()}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {row.is_placeholder ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                      Placeholder
                    </span>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void onDeactivate(row.id)}
                    disabled={savingId === row.id}
                  >
                    Remove
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void onSave(row.id, parseEmails(value), {})}
                    disabled={!dirty || savingId === row.id}
                    loading={savingId === row.id}
                  >
                    Save
                  </Button>
                </div>
              </div>
              <textarea
                value={value}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [row.id]: e.target.value }))}
                rows={2}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-dark focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="name@supplier.com, another@supplier.com"
              />
              <label className="mt-2 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={row.is_placeholder}
                  onChange={(e) => void onSave(row.id, parseEmails(value), { is_placeholder: e.target.checked })}
                />
                Mark as placeholder
              </label>
            </div>
          );
        })}
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500">No recipient lists in this group yet.</p>
        ) : null}
      </div>

      <div className="rounded-xl border border-dashed border-gray-300 p-4 dark:border-gray-600">
        <p className="mb-3 text-sm font-semibold text-dark dark:text-white">Add a new recipient list</p>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="Key (e.g. AGL C&I Electricity)"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Display name"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
          <input
            value={newGroup}
            onChange={(e) => setNewGroup(e.target.value)}
            placeholder="Group (e.g. C&I Electricity)"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
          <input
            value={newEmails}
            onChange={(e) => setNewEmails(e.target.value)}
            placeholder="Emails, comma separated"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <input type="checkbox" checked={newPlaceholder} onChange={(e) => setNewPlaceholder(e.target.checked)} />
          Placeholder (not a live supplier inbox yet)
        </label>
        <div className="mt-3">
          <Button
            size="sm"
            onClick={async () => {
              await onCreate({
                flow,
                key: newKey,
                display_name: newName || newKey,
                emails: parseEmails(newEmails),
                group_name: newGroup,
                is_placeholder: newPlaceholder,
              });
              setNewKey("");
              setNewName("");
              setNewEmails("");
              setNewGroup("");
              setNewPlaceholder(false);
            }}
            disabled={!newKey.trim() || parseEmails(newEmails).length === 0}
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
