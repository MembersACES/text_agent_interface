"use client";

import { useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { getApiBaseUrl } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import type { Client, Note, Offer } from "../types";
import type { ClientStage } from "@/constants/crm";

export interface EditProfileForm {
  business_name: string;
  primary_contact_email: string;
  gdrive_folder_url: string;
  owner_email: string;
}

export interface CreateOfferForm {
  utility_type: string;
  utility_type_identifier: string;
  identifier: string;
  estimated_value: string;
}

export interface UseMemberActionsOptions {
  clientId: number | null;
  client: Client | null;
  setClient: React.Dispatch<React.SetStateAction<Client | null>>;
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  setOffers: React.Dispatch<React.SetStateAction<Offer[]>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  refetchTasks: () => Promise<void>;
}

export interface UseMemberActionsResult {
  savingStage: boolean;
  creatingNote: boolean;
  createOfferSubmitting: boolean;
  editProfileSubmitting: boolean;
  handleStageChange: (value: ClientStage) => Promise<void>;
  handleCreateNote: (params: {
    note: string;
    noteType: string;
    businessName: string;
  }) => Promise<void>;
  handleSaveProfile: (
    e: React.FormEvent,
    form: EditProfileForm
  ) => Promise<void>;
  handleCreateOffer: (
    e: React.FormEvent,
    form: CreateOfferForm,
    onSuccess?: (created: Offer) => void
  ) => Promise<void>;
  handleUpdateNote: (
    noteId: number,
    params: { note: string; note_type?: string }
  ) => Promise<void>;
  handleDeleteNote: (noteId: number) => Promise<void>;
}

export function useMemberActions({
  clientId,
  client,
  setClient,
  setNotes,
  setOffers,
  setError,
  refetchTasks,
}: UseMemberActionsOptions): UseMemberActionsResult {
  const { data: session } = useSession();
  const token = (session as { id_token?: string; accessToken?: string })?.id_token ?? (session as { id_token?: string; accessToken?: string })?.accessToken;
  const { showToast } = useToast();

  const [savingStage, setSavingStage] = useState(false);
  const [creatingNote, setCreatingNote] = useState(false);
  const [createOfferSubmitting, setCreateOfferSubmitting] = useState(false);
  const [editProfileSubmitting, setEditProfileSubmitting] = useState(false);

  const handleStageChange = useCallback(
    async (value: ClientStage) => {
      if (!clientId || !token) return;
      setSavingStage(true);
      setError(null);
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/clients/${clientId}/stage`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ stage: value }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { detail?: string }).detail || "Failed to update stage");
        }
        const updated: Client = await res.json();
        setClient(updated);
        showToast("Stage updated", "success");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to update stage";
        setError(msg);
        showToast(msg, "error");
      } finally {
        setSavingStage(false);
      }
    },
    [clientId, token, setClient, setError, showToast]
  );

  const handleCreateNote = useCallback(
    async ({
      note,
      noteType,
      businessName,
    }: {
      note: string;
      noteType: string;
      businessName: string;
    }) => {
      if (!clientId || !token || !note.trim() || !client) return;
      setCreatingNote(true);
      setError(null);
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/clients/${clientId}/notes`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            business_name: businessName,
            note: note.trim(),
            note_type: noteType || "general",
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { detail?: string }).detail || "Failed to create note");
        }
        const created: Note = await res.json();
        setNotes((prev) => [created, ...prev]);
        showToast("Note added", "success");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to create note";
        setError(msg);
        showToast(msg, "error");
      } finally {
        setCreatingNote(false);
      }
    },
    [clientId, token, client, setNotes, setError, showToast]
  );

  const handleSaveProfile = useCallback(
    async (e: React.FormEvent, form: EditProfileForm) => {
      e.preventDefault();
      if (!clientId || !token || !client) return;
      setEditProfileSubmitting(true);
      setError(null);
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/clients/${clientId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            business_name: form.business_name.trim() || undefined,
            primary_contact_email: form.primary_contact_email.trim() || undefined,
            gdrive_folder_url: form.gdrive_folder_url.trim() || undefined,
            owner_email: form.owner_email.trim() || undefined,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { detail?: string }).detail || "Failed to update member");
        }
        const updated: Client = await res.json();
        setClient(updated);
        showToast("Profile updated", "success");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to update member";
        setError(msg);
        showToast(msg, "error");
      } finally {
        setEditProfileSubmitting(false);
      }
    },
    [clientId, token, client, setClient, setError, showToast]
  );

  const handleCreateOffer = useCallback(
    async (
      e: React.FormEvent,
      form: CreateOfferForm,
      onSuccess?: (created: Offer) => void
    ) => {
      e.preventDefault();
      if (!clientId || !token || !client) return;
      setCreateOfferSubmitting(true);
      setError(null);
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/offers`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_id: client.id,
            business_name: client.business_name,
            utility_type: form.utility_type.trim() || undefined,
            utility_type_identifier: form.utility_type_identifier.trim() || undefined,
            identifier: form.identifier.trim() || undefined,
            estimated_value: form.estimated_value.trim()
              ? parseInt(form.estimated_value, 10)
              : undefined,
            status: "requested",
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { detail?: string }).detail || "Failed to create offer");
        }
        const created: Offer = await res.json();
        setOffers((prev) => [{ ...created, status: created.status }, ...prev]);
        showToast("Offer created", "success");
        onSuccess?.(created);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to create offer";
        setError(msg);
        showToast(msg, "error");
      } finally {
        setCreateOfferSubmitting(false);
      }
    },
    [clientId, token, client, setOffers, setError, showToast]
  );

  const handleUpdateNote = useCallback(
    async (noteId: number, params: { note: string; note_type?: string }) => {
      if (!token) return;
      setError(null);
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/client-status/${noteId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            note: params.note.trim(),
            note_type: params.note_type ?? undefined,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { detail?: string }).detail || "Failed to update note");
        }
        const updated: Note = await res.json();
        setNotes((prev) =>
          prev.map((n) => (n.id === noteId ? { ...n, note: updated.note, note_type: updated.note_type } : n))
        );
        showToast("Note updated", "success");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to update note";
        setError(msg);
        showToast(msg, "error");
      }
    },
    [token, setNotes, setError, showToast]
  );

  const handleDeleteNote = useCallback(
    async (noteId: number) => {
      if (!token) return;
      setError(null);
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/client-status/${noteId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { detail?: string }).detail || "Failed to delete note");
        }
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        showToast("Note deleted", "success");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to delete note";
        setError(msg);
        showToast(msg, "error");
      }
    },
    [token, setNotes, setError, showToast]
  );

  return {
    savingStage,
    creatingNote,
    createOfferSubmitting,
    editProfileSubmitting,
    handleStageChange,
    handleCreateNote,
    handleSaveProfile,
    handleCreateOffer,
    handleUpdateNote,
    handleDeleteNote,
  };
}
