"use client";

import { useMemo, useState, useEffect, type FormEvent } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

import { TaskModal } from "@/components/tasks/TaskModal";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { EmptyState } from "@/components/ui/empty-state";

import { useMemberData } from "@/components/crm-member/hooks/use-member-data";
import { useMemberActions } from "@/components/crm-member/hooks/use-member-actions";

import { MemberProfileHeader } from "@/components/crm-member/MemberProfileHeader";
import { MemberTabs } from "@/components/crm-member/MemberTabs";
import { MemberSidebar } from "@/components/crm-member/MemberSidebar";
import { MemberLoadingSkeleton } from "@/components/crm-member/MemberLoadingSkeleton";
import { SlideOverPanel } from "@/components/crm-member/shared/SlideOverPanel";

import { OverviewTab } from "@/components/crm-member/tabs/OverviewTab";
import { DocumentsTab, getDocumentsCountFromBusinessInfo } from "@/components/crm-member/tabs/DocumentsTab";
import { UtilitiesTab, getUtilitiesCountFromBusinessInfo } from "@/components/crm-member/tabs/UtilitiesTab";
import { OffersTab } from "@/components/crm-member/tabs/OffersTab";
import { ActivityTab } from "@/components/crm-member/tabs/ActivityTab";
import { NotesTab } from "@/components/crm-member/tabs/NotesTab";
import { ToolsTab } from "@/components/crm-member/tabs/ToolsTab";
import { SolutionsTab } from "@/components/crm-member/tabs/SolutionsTab";

import type { MemberTab } from "@/components/crm-member/types";
import type { ClientStage } from "@/constants/crm";

export default function ClientDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const clientId = useMemo(() => {
    const raw = (params as { id?: string | string[] } | null)?.id;
    if (!raw) return null;
    if (Array.isArray(raw)) return parseInt(raw[0], 10);
    return parseInt(raw, 10);
  }, [params]);

  const { data: session } = useSession();
  const tab = (searchParams.get("tab") as MemberTab | null) || "overview";

  const {
    client,
    notes,
    tasks,
    offers,
    activities,
    businessInfo,
    businessInfoLoading,
    loading,
    error,
    setClient,
    setNotes,
    setOffers,
    setBusinessInfo,
    setError,
    refetchTasks,
  } = useMemberData(clientId);

  const [stageValue, setStageValue] = useState<ClientStage | undefined>(
    undefined
  );

  useEffect(() => {
    if (client?.stage != null) setStageValue(client.stage as ClientStage);
  }, [client?.stage]);

  const actions = useMemberActions({
    clientId,
    client,
    setClient,
    setNotes,
    setOffers,
    setError,
    refetchTasks,
  });

  const [businessInfoOpen, setBusinessInfoOpen] = useState(true);
  const [createOfferOpen, setCreateOfferOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [editNoteOpen, setEditNoteOpen] = useState(false);
  const [editNoteForm, setEditNoteForm] = useState({
    noteId: 0,
    note: "",
    note_type: "general",
  });

  const [editProfileForm, setEditProfileForm] = useState({
    business_name: "",
    primary_contact_email: "",
    gdrive_folder_url: "",
    owner_email: "",
  });

  const [createOfferForm, setCreateOfferForm] = useState({
    utility_type: "",
    utility_type_identifier: "",
    identifier: "",
    estimated_value: "",
  });

  const [newNote, setNewNote] = useState("");
  const [newNoteType, setNewNoteType] = useState("general");

  const timelineEvents = useMemo(() => {
    const stageNotes = notes
      .filter((n) => n.note_type === "status_update")
      .map((n) => ({
        type: "stage_change" as const,
        id: `n-${n.id}`,
        created_at: n.created_at,
        note: n.note,
        user_email: n.user_email,
      }));

    const actEvents = activities.map((a) => ({
      type: "offer_activity" as const,
      id: `a-${a.id}`,
      created_at: a.created_at,
      activity_type: a.activity_type,
      offer_id: a.offer_id,
      document_link: a.document_link,
      created_by: a.created_by,
    }));

    return [...stageNotes, ...actEvents].sort(
      (x, y) =>
        new Date(y.created_at).getTime() - new Date(x.created_at).getTime()
    );
  }, [notes, activities]);

  const handleCreateNote = (e: FormEvent) => {
    e.preventDefault();
    if (!client) return;

    actions
      .handleCreateNote({
        note: newNote,
        noteType: newNoteType,
        businessName: client.business_name,
      })
      .then(() => setNewNote(""));
  };

  const handleSaveEditNote = (e: FormEvent) => {
    e.preventDefault();
    if (editNoteForm.noteId === 0) return;
    actions.handleUpdateNote(editNoteForm.noteId, {
      note: editNoteForm.note,
      note_type: editNoteForm.note_type,
    }).then(() => {
      setEditNoteOpen(false);
      setEditNoteForm({ noteId: 0, note: "", note_type: "general" });
    });
  };

  const handleDeleteNote = (noteId: number) => {
    if (typeof window !== "undefined" && !window.confirm("Delete this note?")) return;
    actions.handleDeleteNote(noteId);
  };

  const handleSaveProfile = (e: FormEvent) => {
    actions.handleSaveProfile(e, editProfileForm).then(() => {
      setEditProfileOpen(false);
    });
  };

  const handleCreateOffer = (e: FormEvent) => {
    actions.handleCreateOffer(e, createOfferForm, (created) => {
      setCreateOfferOpen(false);
      setCreateOfferForm({
        utility_type: "",
        utility_type_identifier: "",
        identifier: "",
        estimated_value: "",
      });
      if (typeof window !== "undefined") {
        window.open(`/offers/${created.id}`, "_blank", "noopener,noreferrer");
      }
    });
  };

  const tabConfig = useMemo(
    () => [
      { key: "overview" as const, label: "Overview", count: null },
      {
        key: "documents" as const,
        label: "Documents",
        count: businessInfo ? getDocumentsCountFromBusinessInfo(businessInfo) : null,
      },
      {
        key: "utilities" as const,
        label: "Utilities",
        count: businessInfo ? getUtilitiesCountFromBusinessInfo(businessInfo) : null,
      },
      { key: "offers" as const, label: "Offers", count: offers.length },
      { key: "activity" as const, label: "Activity", count: activities.length },
      { key: "notes" as const, label: "Notes", count: notes.length },
      { key: "tools" as const, label: "Tools", count: null },
      { key: "solutions" as const, label: "Solutions", count: null },
    ],
    [businessInfo, offers.length, activities.length, notes.length]
  );

  if (clientId == null) {
    return (
      <div className="mt-4 text-sm text-red-600 dark:text-red-400">
        Invalid client id.
      </div>
    );
  }

  const basePath = `/crm-members/${clientId}`;

  return (
    <>
      <PageHeader
        pageName="Member"
        title={client?.business_name ?? "Member"}
        description="Member record and activity overview."
      />

      <div className="mt-4 space-y-4">
        {error && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
            {error}
          </div>
        )}

        {loading && !client ? (
          <MemberLoadingSkeleton />
        ) : !client ? (
          <EmptyState
            title="Member not found"
            description="The member may have been removed or you don't have access."
          />
        ) : (
          <>
            <MemberProfileHeader
              client={client}
              stageValue={stageValue}
              savingStage={actions.savingStage}
              onStageChange={(value) => {
                setStageValue(value);
                actions.handleStageChange(value);
              }}
              onEditProfile={() => {
                setEditProfileForm({
                  business_name: client.business_name ?? "",
                  primary_contact_email: client.primary_contact_email ?? "",
                  gdrive_folder_url: client.gdrive_folder_url ?? "",
                  owner_email: client.owner_email ?? "",
                });
                setEditProfileOpen(true);
                setError(null);
              }}
              firstOfferId={offers[0]?.id ?? null}
              businessInfo={businessInfo}
            />

            <MemberTabs basePath={basePath} tabs={tabConfig} />

            <div className="grid gap-4 lg:grid-cols-4">
              <main className="space-y-4 lg:col-span-3">
                {tab === "overview" && (
                  <OverviewTab
                    businessInfo={businessInfo}
                    businessInfoLoading={businessInfoLoading}
                    setBusinessInfo={setBusinessInfo}
                    businessInfoOpen={businessInfoOpen}
                    onToggleBusinessInfo={() => setBusinessInfoOpen((o) => !o)}
                    tasks={tasks}
                    offers={offers}
                    activities={activities}
                    onCreateOfferClick={() => {
                      setCreateOfferOpen(true);
                      setError(null);
                    }}
                  />
                )}

                {tab === "documents" && (
                  <DocumentsTab
                    businessInfo={businessInfo}
                    setBusinessInfo={setBusinessInfo}
                    businessName={client?.business_name ?? null}
                  />
                )}

                {tab === "utilities" && (
                  <UtilitiesTab
                    businessInfo={businessInfo}
                    setBusinessInfo={setBusinessInfo}
                  />
                )}

                {tab === "offers" && (
                  <OffersTab
                    offers={offers}
                    onCreateOfferClick={() => {
                      setCreateOfferOpen(true);
                      setError(null);
                    }}
                  />
                )}

                {tab === "activity" && (
                  <ActivityTab timelineEvents={timelineEvents} />
                )}

                {tab === "notes" && (
                  <NotesTab
                    notes={notes}
                    newNote={newNote}
                    newNoteType={newNoteType}
                    creatingNote={actions.creatingNote}
                    onNewNoteChange={setNewNote}
                    onNewNoteTypeChange={setNewNoteType}
                    onSubmitNote={handleCreateNote}
                    onEditNote={(note) => {
                      setEditNoteForm({
                        noteId: note.id,
                        note: note.note,
                        note_type: note.note_type || "general",
                      });
                      setEditNoteOpen(true);
                      setError(null);
                    }}
                    onDeleteNote={handleDeleteNote}
                  />
                )}

                {tab === "tools" && (
                  <ToolsTab
                    businessInfo={businessInfo}
                    setBusinessInfo={setBusinessInfo}
                  />
                )}

                {tab === "solutions" && (
                  <SolutionsTab
                    businessInfo={businessInfo}
                    setBusinessInfo={setBusinessInfo}
                  />
                )}
              </main>

              <aside className="lg:col-span-1">
                <MemberSidebar
                  client={client}
                  tasks={tasks}
                  timelineEvents={timelineEvents}
                  businessInfo={businessInfo}
                  onAddTaskClick={() => {
                    setAddTaskOpen(true);
                    setError(null);
                  }}
                />
              </aside>
            </div>

            <SlideOverPanel
              open={editProfileOpen}
              onClose={() => setEditProfileOpen(false)}
              title="Edit client profile"
              footer={
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditProfileOpen(false)}
                    className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="edit-profile-form"
                    disabled={actions.editProfileSubmitting}
                    className="px-3 py-1.5 rounded-md bg-primary text-white text-xs font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {actions.editProfileSubmitting ? "Saving..." : "Save"}
                  </button>
                </div>
              }
            >
              <form
                id="edit-profile-form"
                onSubmit={handleSaveProfile}
                className="space-y-3"
              >
                <label className="block">
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Business name
                  </span>
                  <input
                    type="text"
                    value={editProfileForm.business_name}
                    onChange={(e) =>
                      setEditProfileForm((f) => ({
                        ...f,
                        business_name: e.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2.5 py-1.5 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Primary contact email
                  </span>
                  <input
                    type="email"
                    value={editProfileForm.primary_contact_email}
                    onChange={(e) =>
                      setEditProfileForm((f) => ({
                        ...f,
                        primary_contact_email: e.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2.5 py-1.5 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Google Drive folder URL
                  </span>
                  <input
                    type="url"
                    value={editProfileForm.gdrive_folder_url}
                    onChange={(e) =>
                      setEditProfileForm((f) => ({
                        ...f,
                        gdrive_folder_url: e.target.value,
                      }))
                    }
                    placeholder="https://drive.google.com/..."
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2.5 py-1.5 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Owner email
                  </span>
                  <input
                    type="email"
                    value={editProfileForm.owner_email}
                    onChange={(e) =>
                      setEditProfileForm((f) => ({
                        ...f,
                        owner_email: e.target.value,
                      }))
                    }
                    placeholder="ACES team member"
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2.5 py-1.5 text-sm"
                  />
                </label>
              </form>
            </SlideOverPanel>

            <SlideOverPanel
              open={createOfferOpen}
              onClose={() => {
                setCreateOfferOpen(false);
                setCreateOfferForm({
                  utility_type: "",
                  utility_type_identifier: "",
                  identifier: "",
                  estimated_value: "",
                });
              }}
              title="Create offer"
              description={client ? `Client: ${client.business_name}` : undefined}
              footer={
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateOfferOpen(false);
                      setCreateOfferForm({
                        utility_type: "",
                        utility_type_identifier: "",
                        identifier: "",
                        estimated_value: "",
                      });
                    }}
                    className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="create-offer-form"
                    disabled={actions.createOfferSubmitting}
                    className="px-3 py-1.5 rounded-md bg-primary text-white text-xs font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {actions.createOfferSubmitting ? "Creating..." : "Create"}
                  </button>
                </div>
              }
            >
              <form
                id="create-offer-form"
                onSubmit={handleCreateOffer}
                className="space-y-3"
              >
                <label className="block">
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Utility type
                  </span>
                  <input
                    type="text"
                    value={createOfferForm.utility_type}
                    onChange={(e) =>
                      setCreateOfferForm((f) => ({
                        ...f,
                        utility_type: e.target.value,
                      }))
                    }
                    placeholder="e.g. electricity_ci, gas"
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2.5 py-1.5 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Utility type label (optional)
                  </span>
                  <input
                    type="text"
                    value={createOfferForm.utility_type_identifier}
                    onChange={(e) =>
                      setCreateOfferForm((f) => ({
                        ...f,
                        utility_type_identifier: e.target.value,
                      }))
                    }
                    placeholder="e.g. C&I Electricity"
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2.5 py-1.5 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Identifier (NMI, MRIN, etc.)
                  </span>
                  <input
                    type="text"
                    value={createOfferForm.identifier}
                    onChange={(e) =>
                      setCreateOfferForm((f) => ({
                        ...f,
                        identifier: e.target.value,
                      }))
                    }
                    placeholder="e.g. NMI or MRIN"
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2.5 py-1.5 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Estimated value (optional)
                  </span>
                  <input
                    type="number"
                    value={createOfferForm.estimated_value}
                    onChange={(e) =>
                      setCreateOfferForm((f) => ({
                        ...f,
                        estimated_value: e.target.value,
                      }))
                    }
                    placeholder="e.g. 50000"
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2.5 py-1.5 text-sm"
                  />
                </label>
              </form>
            </SlideOverPanel>

            <SlideOverPanel
              open={editNoteOpen}
              onClose={() => {
                setEditNoteOpen(false);
                setEditNoteForm({ noteId: 0, note: "", note_type: "general" });
              }}
              title="Edit note"
              footer={
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditNoteOpen(false);
                      setEditNoteForm({ noteId: 0, note: "", note_type: "general" });
                    }}
                    className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="edit-note-form"
                    className="px-3 py-1.5 rounded-md bg-primary text-white text-xs font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              }
            >
              <form
                id="edit-note-form"
                onSubmit={handleSaveEditNote}
                className="space-y-3"
              >
                <label className="block">
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Type
                  </span>
                  <select
                    value={editNoteForm.note_type}
                    onChange={(e) =>
                      setEditNoteForm((f) => ({ ...f, note_type: e.target.value }))
                    }
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2.5 py-1.5 text-sm"
                  >
                    <option value="general">General</option>
                    <option value="call">Call</option>
                    <option value="email">Email</option>
                    <option value="meeting">Meeting</option>
                  </select>
                </label>
                <label className="block">
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Note
                  </span>
                  <textarea
                    value={editNoteForm.note}
                    onChange={(e) =>
                      setEditNoteForm((f) => ({ ...f, note: e.target.value }))
                    }
                    rows={4}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2.5 py-1.5 text-sm"
                    required
                  />
                </label>
              </form>
            </SlideOverPanel>

            {addTaskOpen && client && (
              <TaskModal
                mode="create"
                isOpen={addTaskOpen}
                onClose={() => setAddTaskOpen(false)}
                onSaved={async () => {
                  await refetchTasks();
                }}
                initialValues={{
                  title: "",
                  description: "",
                  due_date: "",
                  assigned_to:
                    (session as { user?: { email?: string } })?.user?.email ??
                    "",
                  business_id: "",
                  client_id: String(client.id),
                }}
                lockClient={true}
                clientLabel="Member"
              />
            )}
          </>
        )}
      </div>
    </>
  );
}