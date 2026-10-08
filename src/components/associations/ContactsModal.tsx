"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AssociationContact, AssociationContactInput } from "@/lib/associations-api";

type ContactDraft = {
  name: string;
  role: string;
  email: string;
  phone: string;
  mobile: string;
  notes: string;
  primary: boolean;
};

type ContactsEditorProps = {
  sheetUrl: string | null;
  contacts: AssociationContact[];
  loading: boolean;
  loadingLabel: string;
  error: string | null;
  onAdd: (input: AssociationContactInput) => Promise<void>;
  onUpdate: (id: string, input: AssociationContactInput) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onReload: () => void;
};

const FIELD_CLASS =
  "w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-dark focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white";

const EMPTY_DRAFT: ContactDraft = {
  name: "",
  role: "",
  email: "",
  phone: "",
  mobile: "",
  notes: "",
  primary: false,
};

function draftFromContact(contact: AssociationContact): ContactDraft {
  return {
    name: contact.name,
    role: contact.role,
    email: contact.email,
    phone: contact.phone,
    mobile: contact.mobile,
    notes: contact.notes,
    primary: contact.primary,
  };
}

function contactLine(contact: AssociationContact): string {
  return [contact.role, contact.email, contact.phone, contact.mobile].filter(Boolean).join(" · ");
}

function ContactFields({
  draft,
  onChange,
  idPrefix,
}: {
  draft: ContactDraft;
  onChange: (next: ContactDraft) => void;
  idPrefix: string;
}) {
  const set = (key: keyof ContactDraft, value: string | boolean) => {
    onChange({ ...draft, [key]: value });
  };
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">
        Name
        <input
          id={`${idPrefix}-name`}
          className={`${FIELD_CLASS} mt-1`}
          value={draft.name}
          onChange={(event) => set("name", event.target.value)}
        />
      </label>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">
        Role
        <input
          id={`${idPrefix}-role`}
          className={`${FIELD_CLASS} mt-1`}
          value={draft.role}
          onChange={(event) => set("role", event.target.value)}
        />
      </label>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">
        Email
        <input
          id={`${idPrefix}-email`}
          type="email"
          className={`${FIELD_CLASS} mt-1`}
          value={draft.email}
          onChange={(event) => set("email", event.target.value)}
        />
      </label>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">
        Phone
        <input
          id={`${idPrefix}-phone`}
          className={`${FIELD_CLASS} mt-1`}
          value={draft.phone}
          onChange={(event) => set("phone", event.target.value)}
        />
      </label>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">
        Mobile
        <input
          id={`${idPrefix}-mobile`}
          className={`${FIELD_CLASS} mt-1`}
          value={draft.mobile}
          onChange={(event) => set("mobile", event.target.value)}
        />
      </label>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">
        Notes
        <input
          id={`${idPrefix}-notes`}
          className={`${FIELD_CLASS} mt-1`}
          value={draft.notes}
          onChange={(event) => set("notes", event.target.value)}
        />
      </label>
    </div>
  );
}

export function ContactsEditor({
  sheetUrl,
  contacts,
  loading,
  loadingLabel,
  error,
  onAdd,
  onUpdate,
  onRemove,
  onReload,
}: ContactsEditorProps) {
  const [draft, setDraft] = useState<ContactDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<ContactDraft>(EMPTY_DRAFT);
  const [busy, setBusy] = useState<{ id: string; action: "primary" | "remove" | "save" } | null>(null);
  const [adding, setAdding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (editingId && !contacts.some((contact) => contact.id === editingId)) {
      setEditingId(null);
    }
  }, [contacts, editingId]);

  const addContact = async () => {
    if (!draft.name.trim()) {
      setActionError("Contact name is required.");
      return;
    }
    setAdding(true);
    setActionError(null);
    try {
      await onAdd(draft);
      setDraft(EMPTY_DRAFT);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setAdding(false);
    }
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (!editDraft.name.trim()) {
      setActionError("Contact name is required.");
      return;
    }
    setBusy({ id: editingId, action: "save" });
    setActionError(null);
    try {
      await onUpdate(editingId, {
        name: editDraft.name,
        role: editDraft.role,
        email: editDraft.email,
        phone: editDraft.phone,
        mobile: editDraft.mobile,
        notes: editDraft.notes,
      });
      setEditingId(null);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const makePrimary = async (contact: AssociationContact) => {
    setBusy({ id: contact.id, action: "primary" });
    setActionError(null);
    try {
      await onUpdate(contact.id, { primary: true });
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const removeContact = async (contact: AssociationContact) => {
    setBusy({ id: contact.id, action: "remove" });
    setActionError(null);
    try {
      await onRemove(contact.id);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="max-w-xl text-sm text-gray-500">
            Add, edit, or remove people here. The primary person is shown under the association name.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onReload}
              disabled={loading}
              className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
            >
              Reload
            </button>
            {sheetUrl ? (
              <a
                href={sheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Open in Sheets
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {actionError ? <p className="text-sm text-red-600">{actionError}</p> : null}

        {loading ? (
          <p className="text-sm text-gray-500">{loadingLabel}</p>
        ) : (
          <>
            <div className="space-y-3 rounded-xl border border-stroke p-3 dark:border-dark-3">
              <p className="text-sm font-medium text-dark dark:text-white">Add a person</p>
              <ContactFields draft={draft} onChange={setDraft} idPrefix="new-contact" />
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={draft.primary}
                  onChange={(event) => setDraft({ ...draft, primary: event.target.checked })}
                />
                Show under the association name
              </label>
              <div className="flex justify-end">
                <Button size="sm" onClick={() => void addContact()} loading={adding} disabled={!draft.name.trim()}>
                  Add
                </Button>
              </div>
            </div>

            {contacts.length === 0 ? (
              <p className="text-sm text-gray-500">No contacts yet.</p>
            ) : (
              <ul className="divide-y divide-stroke rounded-xl border border-stroke dark:divide-dark-3 dark:border-dark-3">
                {contacts.map((contact) => {
                  const rowBusy = busy?.id === contact.id;
                  const editing = editingId === contact.id;
                  return (
                    <li key={contact.id} className="space-y-2 px-3 py-3">
                      {editing ? (
                        <>
                          <ContactFields draft={editDraft} onChange={setEditDraft} idPrefix={`edit-${contact.id}`} />
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="secondary" onClick={() => setEditingId(null)} disabled={rowBusy}>
                              Cancel
                            </Button>
                            <Button size="sm" onClick={() => void saveEdit()} loading={rowBusy && busy?.action === "save"}>
                              Save
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-dark dark:text-white">
                              {contact.name}
                              {contact.primary ? (
                                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                  Primary
                                </span>
                              ) : null}
                            </p>
                            {contactLine(contact) ? (
                              <p className="mt-0.5 text-xs text-gray-500">{contactLine(contact)}</p>
                            ) : null}
                            {contact.notes ? (
                              <p className="mt-1 text-xs text-gray-500">{contact.notes}</p>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {contact.primary ? null : (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => void makePrimary(contact)}
                                loading={rowBusy && busy?.action === "primary"}
                                disabled={rowBusy}
                              >
                                Make primary
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setActionError(null);
                                setEditingId(contact.id);
                                setEditDraft(draftFromContact(contact));
                              }}
                              disabled={rowBusy}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => void removeContact(contact)}
                              loading={rowBusy && busy?.action === "remove"}
                              disabled={rowBusy}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
  );
}
