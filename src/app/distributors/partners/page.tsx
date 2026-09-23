"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ExternalLink, FolderOpen, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchDistributorFolders, type DistributorFolder } from "@/lib/distributors-drive-api";
import {
  createDistributorPartner,
  deactivateDistributorPartner,
  deactivateDistributorPartnerUser,
  fetchDistributorPartners,
  inviteDistributorPartnerUser,
  updateDistributorPartner,
  type DistributorPartner,
  type PartnerToolOption,
} from "@/lib/partner-admin-api";
import { cn } from "@/lib/utils";

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sessionToken(session: unknown): string {
  const row = session as { id_token?: string; accessToken?: string } | null;
  return row?.id_token ?? row?.accessToken ?? "";
}

const fieldClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-dark focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white";

export default function DistributorPartnersPage() {
  const { data: session, status: sessionStatus } = useSession();
  const token = sessionToken(session);

  const [partners, setPartners] = useState<DistributorPartner[]>([]);
  const [tools, setTools] = useState<PartnerToolOption[]>([]);
  const [folders, setFolders] = useState<DistributorFolder[]>([]);
  const [foldersError, setFoldersError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | "new" | null>(null);
  const [returnId, setReturnId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDistributorPartners(token);
      setPartners(data.partners);
      setTools(data.tools);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadFolders = useCallback(async () => {
    if (!token) return;
    setFoldersError(null);
    try {
      const data = await fetchDistributorFolders(token);
      setFolders(data.distributors);
    } catch (err: unknown) {
      setFolders([]);
      setFoldersError(err instanceof Error ? err.message : String(err));
    }
  }, [token]);

  useEffect(() => {
    if (sessionStatus !== "authenticated" || !token) return;
    void load();
    void loadFolders();
  }, [sessionStatus, token, load, loadFolders]);

  const selected = useMemo(
    () => (typeof selectedId === "number" ? partners.find((row) => row.id === selectedId) ?? null : null),
    [partners, selectedId],
  );

  const replacePartner = (row: DistributorPartner) => {
    setPartners((current) => {
      const rest = current.filter((item) => item.id !== row.id);
      return [row, ...rest].sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    });
    setSelectedId(row.id);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        pageName="Distributor partners"
        title="Distributor partners"
        description="Create a distributor login, attach its Drive folder, and choose which tools that distributor can use."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/distributors"
              className="inline-flex items-center gap-1.5 rounded-full border border-stroke bg-white px-4 py-2 text-sm font-medium text-dark hover:bg-gray-2 dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:hover:bg-dark-2"
            >
              Drive folders
            </Link>
            <Button
              onClick={() => {
                setReturnId(typeof selectedId === "number" ? selectedId : null);
                setSelectedId("new");
              }}
              leftIcon={<UserPlus className="h-4 w-4" />}
            >
              New distributor
            </Button>
          </div>
        }
      />

      {sessionStatus === "unauthenticated" || !token ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
          Sign in to manage distributor partners.
        </p>
      ) : loading && partners.length === 0 ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(240px,320px)_1fr] lg:items-start">
          <div className="overflow-hidden rounded-xl border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark">
            <div className="border-b border-stroke px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-dark-3 dark:text-gray-400">
              {partners.length} distributor{partners.length === 1 ? "" : "s"}
            </div>
            {partners.length === 0 ? (
              <p className="px-3 py-6 text-sm text-gray-500">No distributor partners yet.</p>
            ) : (
              <ul className="max-h-[min(70vh,720px)] divide-y divide-stroke overflow-y-auto dark:divide-dark-3">
                {partners.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(row.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm",
                        selectedId === row.id
                          ? "bg-primary/10 font-semibold text-primary dark:bg-primary/20"
                          : "hover:bg-gray-2 dark:hover:bg-dark-2",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate">{row.name}</span>
                        <span className="block truncate text-xs font-normal text-gray-500">{row.slug}</span>
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                          row.active
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "bg-gray-100 text-gray-600 dark:bg-dark-2 dark:text-gray-400",
                        )}
                      >
                        {row.active ? "Active" : "Deactivated"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark sm:p-6">
            {error ? (
              <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
                {error}
              </p>
            ) : null}
            {selectedId === "new" ? (
              <CreatePartnerForm
                token={token}
                tools={tools}
                folders={folders}
                foldersError={foldersError}
                linkedFolderIds={new Set(partners.map((row) => row.drive_folder_id).filter(Boolean) as string[])}
                busy={busy}
                onCancel={() => setSelectedId(returnId)}
                onSubmit={async (body) => {
                  setBusy(true);
                  setError(null);
                  try {
                    const row = await createDistributorPartner(token, body);
                    replacePartner(row);
                    void loadFolders();
                  } catch (err: unknown) {
                    setError(err instanceof Error ? err.message : String(err));
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            ) : selected ? (
              <PartnerDetail
                token={token}
                partner={selected}
                tools={tools}
                folders={folders}
                foldersError={foldersError}
                linkedFolderIds={
                  new Set(
                    partners
                      .filter((row) => row.id !== selected.id)
                      .map((row) => row.drive_folder_id)
                      .filter(Boolean) as string[],
                  )
                }
                busy={busy}
                onBusy={setBusy}
                onError={setError}
                onUpdated={replacePartner}
              />
            ) : (
              <EmptyState
                icon={<FolderOpen className="h-10 w-10" />}
                title="Select a distributor"
                description="Or create one. The Drive folder is created or linked when you save, so the portal and Drive stay the same distributor."
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CreatePartnerForm({
  token,
  tools,
  folders,
  foldersError,
  linkedFolderIds,
  busy,
  onCancel,
  onSubmit,
}: {
  token: string;
  tools: PartnerToolOption[];
  folders: DistributorFolder[];
  foldersError: string | null;
  linkedFolderIds: Set<string>;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (body: {
    name: string;
    slug: string;
    enabled_tools: string[];
    drive_folder_id?: string | null;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [enabled, setEnabled] = useState<string[]>(() => tools.map((tool) => tool.id).filter((id) => id === "base1"));
  const [linkExisting, setLinkExisting] = useState(false);
  const [folderId, setFolderId] = useState("");

  useEffect(() => {
    setEnabled((current) => (current.length ? current : tools.filter((tool) => tool.id === "base1").map((tool) => tool.id)));
  }, [tools]);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit({
          name,
          slug,
          enabled_tools: enabled,
          drive_folder_id: linkExisting ? folderId : null,
        });
      }}
    >
      <h2 className="text-lg font-semibold text-dark dark:text-white">New distributor</h2>
      <Input
        label="Name"
        value={name}
        onChange={(event) => {
          const next = event.target.value;
          setName(next);
          if (!slugEdited) setSlug(slugify(next));
        }}
        required
      />
      <Input
        label="Slug"
        value={slug}
        hint="Used in the new Drive folder name when you are not linking an existing folder."
        onChange={(event) => {
          setSlugEdited(true);
          setSlug(event.target.value);
        }}
        required
      />
      <ToolChecks tools={tools} enabled={enabled} onChange={setEnabled} />
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-dark dark:text-white">Drive folder</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="drive-mode"
            checked={!linkExisting}
            onChange={() => setLinkExisting(false)}
          />
          Create a folder under 003-Distributors now
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="drive-mode"
            checked={linkExisting}
            onChange={() => setLinkExisting(true)}
          />
          Link an existing Drive distributor
        </label>
        {linkExisting ? (
          <FolderSelect
            folders={folders}
            foldersError={foldersError}
            folderId={folderId}
            linkedFolderIds={linkedFolderIds}
            onChange={setFolderId}
          />
        ) : (
          <p className="text-xs text-gray-500">
            Saving creates <span className="font-medium">Partner - {slug || "slug"}</span> before anyone signs in.
          </p>
        )}
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={busy} disabled={!token || (linkExisting && !folderId)}>
          Create distributor
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function PartnerDetail({
  token,
  partner,
  tools,
  folders,
  foldersError,
  linkedFolderIds,
  busy,
  onBusy,
  onError,
  onUpdated,
}: {
  token: string;
  partner: DistributorPartner;
  tools: PartnerToolOption[];
  folders: DistributorFolder[];
  foldersError: string | null;
  linkedFolderIds: Set<string>;
  busy: boolean;
  onBusy: (value: boolean) => void;
  onError: (value: string | null) => void;
  onUpdated: (row: DistributorPartner) => void;
}) {
  const [enabled, setEnabled] = useState(partner.enabled_tools);
  const [folderId, setFolderId] = useState(partner.drive_folder_id ?? "");
  const [email, setEmail] = useState("");

  useEffect(() => {
    setEnabled(partner.enabled_tools);
    setFolderId(partner.drive_folder_id ?? "");
    setEmail("");
  }, [partner]);

  const run = async (work: () => Promise<DistributorPartner>) => {
    onBusy(true);
    onError(null);
    try {
      onUpdated(await work());
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      onBusy(false);
    }
  };

  const toolsDirty =
    enabled.length !== partner.enabled_tools.length ||
    enabled.some((tool) => !partner.enabled_tools.includes(tool));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-dark dark:text-white">{partner.name}</h2>
          <p className="text-sm text-gray-500">{partner.slug}</p>
        </div>
        {partner.active ? (
          <Button
            variant="danger"
            disabled={busy}
            onClick={() => {
              if (
                !window.confirm(
                  "Deactivate this distributor? Every login stops signing in. The Drive folder and records stay.",
                )
              ) {
                return;
              }
              void run(() => deactivateDistributorPartner(token, partner.id));
            }}
          >
            Deactivate distributor
          </Button>
        ) : (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600 dark:bg-dark-2 dark:text-gray-300">
            Deactivated
          </span>
        )}
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-medium text-dark dark:text-white">Drive folder</h3>
        {partner.drive_folder_url ? (
          <a
            href={partner.drive_folder_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Open linked folder
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : (
          <p className="text-sm text-gray-500">No Drive folder yet.</p>
        )}
        <FolderSelect
          folders={folders}
          foldersError={foldersError}
          folderId={folderId}
          linkedFolderIds={linkedFolderIds}
          currentId={partner.drive_folder_id}
          onChange={setFolderId}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={busy || !folderId || folderId === partner.drive_folder_id}
            onClick={() =>
              void run(() =>
                updateDistributorPartner(token, partner.id, { drive_folder_id: folderId }),
              )
            }
          >
            Link folder
          </Button>
          {!partner.drive_folder_id ? (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void run(() =>
                  updateDistributorPartner(token, partner.id, { provision_drive_folder: true }),
                )
              }
            >
              Create folder now
            </Button>
          ) : null}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium text-dark dark:text-white">Enabled tools</h3>
        <ToolChecks tools={tools} enabled={enabled} onChange={setEnabled} />
        <Button
          variant="secondary"
          disabled={busy || !toolsDirty}
          onClick={() =>
            void run(() => updateDistributorPartner(token, partner.id, { enabled_tools: enabled }))
          }
        >
          Save tools
        </Button>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-dark dark:text-white">Logins</h3>
        {partner.users.length === 0 ? (
          <p className="text-sm text-gray-500">No logins yet.</p>
        ) : (
          <ul className="divide-y divide-stroke rounded-lg border border-stroke dark:divide-dark-3 dark:border-dark-3">
            {partner.users.map((user) => (
              <li key={user.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <div>
                  <p className="text-sm text-dark dark:text-white">{user.email}</p>
                  <p className="text-xs text-gray-500">{user.active ? "Active" : "Deactivated"}</p>
                </div>
                {user.active ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => {
                      if (
                        !window.confirm(
                          `${user.email} will no longer be able to sign in. Other logins for this distributor stay active.`,
                        )
                      ) {
                        return;
                      }
                      void run(() => deactivateDistributorPartnerUser(token, partner.id, user.id));
                    }}
                  >
                    Deactivate login
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            const next = email.trim();
            if (!next) return;
            void run(async () => {
              const row = await inviteDistributorPartnerUser(token, partner.id, next);
              setEmail("");
              return row;
            });
          }}
        >
          <Input
            label="Invite email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@distributor.com.au"
            hint="This person needs a Google account on that email address. They sign in with Google."
            disabled={!partner.active}
          />
          <Button type="submit" disabled={busy || !partner.active || !email.trim()}>
            Add login
          </Button>
        </form>
      </section>
    </div>
  );
}

function ToolChecks({
  tools,
  enabled,
  onChange,
}: {
  tools: PartnerToolOption[];
  enabled: string[];
  onChange: (next: string[]) => void;
}) {
  if (tools.length === 0) {
    return <p className="text-sm text-gray-500">No tools are configured.</p>;
  }
  return (
    <div className="flex flex-wrap gap-4">
      {tools.map((tool) => {
        const checked = enabled.includes(tool.id);
        return (
          <label key={tool.id} className="flex items-center gap-2 text-sm text-dark dark:text-white">
            <input
              type="checkbox"
              checked={checked}
              onChange={() =>
                onChange(checked ? enabled.filter((id) => id !== tool.id) : [...enabled, tool.id])
              }
            />
            {tool.label}
          </label>
        );
      })}
    </div>
  );
}

function FolderSelect({
  folders,
  foldersError,
  folderId,
  linkedFolderIds,
  currentId,
  onChange,
}: {
  folders: DistributorFolder[];
  foldersError: string | null;
  folderId: string;
  linkedFolderIds: Set<string>;
  currentId?: string | null;
  onChange: (value: string) => void;
}) {
  const known = new Set(folders.map((row) => row.id));
  return (
    <div className="space-y-1">
      <select className={fieldClass} value={folderId} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select a Drive folder</option>
        {currentId && !known.has(currentId) ? (
          <option value={currentId}>Current folder ({currentId})</option>
        ) : null}
        {folders.map((folder) => {
          const taken = linkedFolderIds.has(folder.id);
          return (
            <option key={folder.id} value={folder.id} disabled={taken}>
              {folder.display_name || folder.name}
              {taken ? " (already linked)" : ""}
            </option>
          );
        })}
      </select>
      {foldersError ? <p className="text-xs text-amber-700 dark:text-amber-300">{foldersError}</p> : null}
    </div>
  );
}
