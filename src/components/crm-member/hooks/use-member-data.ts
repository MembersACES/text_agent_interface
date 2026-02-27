"use client";

import { useEffect, useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { getApiBaseUrl } from "@/lib/utils";
import type {
  Client,
  Note,
  Task,
  Offer,
  ClientActivity,
} from "../types";

export interface UseMemberDataResult {
  client: Client | null;
  notes: Note[];
  tasks: Task[];
  offers: Offer[];
  activities: ClientActivity[];
  businessInfo: Record<string, unknown> | null;
  businessInfoLoading: boolean;
  loading: boolean;
  error: string | null;
  setClient: React.Dispatch<React.SetStateAction<Client | null>>;
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  setOffers: React.Dispatch<React.SetStateAction<Offer[]>>;
  setActivities: React.Dispatch<React.SetStateAction<ClientActivity[]>>;
  setBusinessInfo: React.Dispatch<React.SetStateAction<Record<string, unknown> | null>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  refetch: () => Promise<void>;
  refetchTasks: () => Promise<void>;
}

export function useMemberData(clientId: number | null): UseMemberDataResult {
  const { data: session } = useSession();
  const token = (session as { id_token?: string; accessToken?: string })?.id_token ?? (session as { id_token?: string; accessToken?: string })?.accessToken;

  const [client, setClient] = useState<Client | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [activities, setActivities] = useState<ClientActivity[]>([]);
  const [businessInfo, setBusinessInfo] = useState<Record<string, unknown> | null>(null);
  const [businessInfoLoading, setBusinessInfoLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetchTasks = useCallback(async () => {
    if (!clientId || !token) return;
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/clients/${clientId}/tasks`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        setTasks([]);
        return;
      }
      const data: Task[] = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch {
      setTasks([]);
    }
  }, [clientId, token]);

  const refetch = useCallback(async () => {
    if (!clientId || !token) {
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
      try {
        setLoading(true);
        setError(null);

        const base = getApiBaseUrl();
        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };

        const [clientRes, notesRes, tasksRes, offersRes, activitiesRes] =
          await Promise.all([
            fetch(`${base}/api/clients/${clientId}`, { headers }),
            fetch(`${base}/api/clients/${clientId}/notes`, { headers }),
            fetch(`${base}/api/clients/${clientId}/tasks`, { headers }),
            fetch(`${base}/api/offers?client_id=${clientId}`, { headers }),
            fetch(`${base}/api/clients/${clientId}/activities`, { headers }),
          ]);

        if (!clientRes.ok) {
          const data = await clientRes.json().catch(() => ({}));
          throw new Error((data as { detail?: string }).detail || "Failed to load member");
        }

        const clientData: Client = await clientRes.json();
        setClient(clientData);

        if (notesRes.ok) {
          const notesData: Note[] = await notesRes.json();
          setNotes(Array.isArray(notesData) ? notesData : []);
        } else {
          setNotes([]);
        }

        if (tasksRes.ok) {
          const taskData: Task[] = await tasksRes.json();
          setTasks(Array.isArray(taskData) ? taskData : []);
        } else {
          setTasks([]);
        }

        if (offersRes.ok) {
          const offerData: Offer[] = await offersRes.json();
          setOffers(Array.isArray(offerData) ? offerData : []);
        } else {
          setOffers([]);
        }

        if (activitiesRes.ok) {
          const activitiesData: ClientActivity[] = await activitiesRes.json();
          setActivities(Array.isArray(activitiesData) ? activitiesData : []);
        } else {
          setActivities([]);
        }

        if (clientData.business_name) {
          setBusinessInfoLoading(true);
          try {
            const biRes = await fetch(`${base}/api/get-business-info`, {
              method: "POST",
              headers,
              body: JSON.stringify({ business_name: clientData.business_name }),
            });
            if (biRes.ok) {
              const biData = await biRes.json();
              setBusinessInfo(biData);
            }
          } finally {
            setBusinessInfoLoading(false);
          }
        }
      } catch (e: unknown) {
        console.error("Error loading client view", e);
        setError(e instanceof Error ? e.message : "Failed to load member");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [clientId, token]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
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
    setTasks,
    setOffers,
    setActivities,
    setBusinessInfo,
    setError,
    refetch,
    refetchTasks,
  };
}
