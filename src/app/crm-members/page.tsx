"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Filter, FolderOpen, Search, Users } from "lucide-react";
import flatpickr from "flatpickr";
import { getApiBaseUrl, cn } from "@/lib/utils";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
  DropdownClose,
} from "@/components/ui/dropdown";
import { SegmentedControl } from "@/components/dashboard";
import { RecentMembersRow } from "@/components/member-profile";
import {
  getRecentMemberViews,
  getMemberInitials,
  type RecentMemberView,
} from "@/lib/member-profile-recent";
import { StageBadge } from "@/components/crm-member/shared/StageBadge";
import { SectionHeader } from "@/components/crm-member/shared/SectionHeader";
import { RecordRow } from "@/components/crm-member/shared/RecordRow";
import {
  CLIENT_STAGES,
  CLIENT_STAGE_LABELS,
  ClientStage,
} from "@/constants/crm";

interface Client {
  id: number;
  business_name: string;
  external_business_id?: string | null;
  primary_contact_email?: string | null;
  gdrive_folder_url?: string | null;
  stage: ClientStage;
  owner_email?: string | null;
  has_signed_contract?: boolean;
  signed_contract_utilities?: string[] | null;
  signed_contract_checked_at?: string | null;
  created_at: string;
  updated_at: string;
  entity_group_id?: number | null;
  entity_group_slug?: string | null;
  entity_group_display_name?: string | null;
}

interface EntityGroupOption {
  id: number;
  slug: string;
  display_name: string;
  member_count?: number;
}

function isSignedNotPromoted(client: Client): boolean {
  return (
    Boolean(client.has_signed_contract) &&
    (client.stage === "lead" || client.stage === "qualified")
  );
}

const PAGE_SIZE = 20;

const STAGE_AVATAR_CLASS: Record<string, string> = {
  lead: "bg-gray-2 text-dark-5 dark:bg-dark-3 dark:text-gray-5",
  qualified: "bg-blue-5 text-blue-dark dark:bg-blue/25 dark:text-blue-light-2",
  loa_signed: "bg-violet-100 text-violet-800 dark:bg-violet-900/25 dark:text-violet-200",
  data_collected: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  analysis_in_progress: "bg-blue-5 text-blue-dark dark:bg-blue/25 dark:text-blue-light-2",
  offer_sent: "bg-blue-5 text-blue-dark dark:bg-blue/25 dark:text-blue-light-2",
  won: "bg-green-light-6 text-green-dark dark:bg-green-dark/25 dark:text-green-light-2",
  existing_client: "bg-green-light-6 text-green-dark dark:bg-green-dark/25 dark:text-green-light-2",
  lost: "bg-red-light-6 text-red-dark dark:bg-red/25 dark:text-red-light",
};

const STAGE_SECTION_ACCENT: Record<string, string> = {
  lead: "border-l-gray-400",
  qualified: "border-l-blue-dark",
  loa_signed: "border-l-violet-500",
  data_collected: "border-l-teal-500",
  analysis_in_progress: "border-l-blue-dark",
  offer_sent: "border-l-blue-dark",
  won: "border-l-green-dark",
  existing_client: "border-l-green-dark",
  lost: "border-l-red-dark",
};

function getStageAvatarClass(stage: string): string {
  return STAGE_AVATAR_CLASS[stage.toLowerCase()] ?? STAGE_AVATAR_CLASS.lead;
}

function getStageSectionAccent(stage: string): string {
  return STAGE_SECTION_ACCENT[stage.toLowerCase()] ?? "border-l-gray-400";
}

function CountBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex min-w-[20px] h-5 items-center justify-center rounded-full bg-gray-100 px-1.5 text-[11px] font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
      {count}
    </span>
  );
}

function DateRangeFilter({
  createdAfter,
  createdBefore,
  onChange,
}: {
  createdAfter: string;
  createdBefore: string;
  onChange: (after: string, before: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const fp = flatpickr(el, {
      mode: "range",
      dateFormat: "Y-m-d",
      onChange: (dates) => {
        if (dates.length >= 2) {
          const after = flatpickr.formatDate(dates[0], "Y-m-d");
          const before = flatpickr.formatDate(dates[1], "Y-m-d");
          onChangeRef.current(after, before);
        } else if (dates.length === 1) {
          onChangeRef.current(flatpickr.formatDate(dates[0], "Y-m-d"), "");
        } else {
          onChangeRef.current("", "");
        }
      },
    });

    return () => {
      fp.destroy();
    };
  }, []);

  const displayValue =
    createdAfter && createdBefore
      ? `${createdAfter} – ${createdBefore}`
      : createdAfter
        ? `${createdAfter} – …`
        : "";

  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
        Created date range
      </label>
      <input
        ref={inputRef}
        type="text"
        readOnly
        placeholder="Select date range"
        defaultValue={displayValue}
        className="w-full cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-dark outline-none transition focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
      />
    </div>
  );
}

export default function ClientsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const token = (session as any)?.id_token || (session as any)?.accessToken;
  const searchParams = useSearchParams();
  const businessNameParam = searchParams.get("businessName");
  const hasAutoResolved = useRef(false);

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [filterStage, setFilterStage] = useState<string>("");
  const [filterCreatedAfter, setFilterCreatedAfter] = useState<string>("");
  const [filterCreatedBefore, setFilterCreatedBefore] = useState<string>("");
  const [filterMine, setFilterMine] = useState(false);
  const [filterSignedNotPromoted, setFilterSignedNotPromoted] = useState(false);
  const [filterEntityGroup, setFilterEntityGroup] = useState("");
  const [entityGroupOptions, setEntityGroupOptions] = useState<EntityGroupOption[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [addClientForm, setAddClientForm] = useState({
    business_name: "",
    primary_contact_email: "",
    stage: "lead" as ClientStage,
    owner_email: "",
    entity_group_id: "",
  });
  const [addClientSubmitting, setAddClientSubmitting] = useState(false);
  const [addClientError, setAddClientError] = useState<string | null>(null);
  const [offerCountByClientId, setOfferCountByClientId] = useState<Record<string, number>>({});
  const [totalClients, setTotalClients] = useState<number>(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkOwnerOpen, setBulkOwnerOpen] = useState(false);
  const [bulkOwnerEmail, setBulkOwnerEmail] = useState("");
  const [bulkOwnerSubmitting, setBulkOwnerSubmitting] = useState(false);
  const [bulkStageOpen, setBulkStageOpen] = useState(false);
  const [bulkStage, setBulkStage] = useState<ClientStage>("lead");
  const [bulkStageSubmitting, setBulkStageSubmitting] = useState(false);
  const [bulkPromoteOpen, setBulkPromoteOpen] = useState(false);
  const [bulkPromoteSubmitting, setBulkPromoteSubmitting] = useState(false);
  const [syncSubmitting, setSyncSubmitting] = useState(false);
  const [syncSummary, setSyncSummary] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [rowStageClientId, setRowStageClientId] = useState<number | null>(null);
  const [rowStageSubmitting, setRowStageSubmitting] = useState(false);
  const [rowMenuClientId, setRowMenuClientId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"pipeline" | "flat">("pipeline");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [legacyLookupExpanded, setLegacyLookupExpanded] = useState(false);
  const [recentMembers, setRecentMembers] = useState<RecentMemberView[]>([]);

  const showLegacyLookupAfterEmptySearch =
    !loading &&
    searchDebounced.trim() &&
    clients.length === 0 &&
    !filterStage &&
    !filterMine;

  const showLegacyLookup =
    Boolean(businessNameParam?.trim()) ||
    showLegacyLookupAfterEmptySearch ||
    legacyLookupExpanded;

  const isAcesStaff = ((session as { user?: { email?: string } })?.user?.email || "")
    .toLowerCase()
    .endsWith("@acesolutions.com.au");

  const activeFilterCount = [
    filterStage,
    filterCreatedAfter,
    filterCreatedBefore,
    filterMine,
    filterSignedNotPromoted,
    filterEntityGroup,
  ].filter(Boolean).length;

  useEffect(() => {
    setRecentMembers(getRecentMemberViews());
  }, []);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/entity-groups`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = (await res.json()) as EntityGroupOption[];
        setEntityGroupOptions(Array.isArray(data) ? data : []);
      } catch {
        setEntityGroupOptions([]);
      }
    })();
  }, [token]);

  const resolveBusinessToMember = useCallback(
    async (name: string) => {
      const queryName = name.trim();
      if (!queryName) {
        setLookupError("Enter a business name to search.");
        return;
      }
      if (!token) {
        setLookupError("Please sign in to search.");
        return;
      }

      setLookupError(null);
      setLookupLoading(true);
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/get-business-info`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ business_name: queryName }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { detail?: string }).detail || "Member not found");
        }

        const data = await res.json();
        const clientId = (data as { client_id?: number | null }).client_id;
        const resolvedName =
          (data as { business_details?: { name?: string } })?.business_details?.name ||
          queryName;

        if (clientId != null) {
          router.push(`/crm-members/${clientId}`);
          return;
        }

        router.push(
          `/business-info?businessName=${encodeURIComponent(resolvedName)}`
        );
      } catch (err: unknown) {
        setLookupError(err instanceof Error ? err.message : "Could not resolve member");
      } finally {
        setLookupLoading(false);
      }
    },
    [token, router]
  );

  const handleRecentSelect = useCallback(
    (entry: RecentMemberView) => {
      if (entry.clientId != null) {
        router.push(`/crm-members/${entry.clientId}`);
        return;
      }
      void resolveBusinessToMember(entry.businessName);
    },
    [router, resolveBusinessToMember]
  );

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (searchParams.get("openAdd") === "1") {
      setAddClientOpen(true);
      setAddClientForm((f) => ({
        ...f,
        stage: "lead",
        owner_email: (session as any)?.user?.email ?? "",
      }));
    }
  }, [searchParams, session]);

  useEffect(() => {
    if (hasAutoResolved.current) return;
    const name = businessNameParam?.trim();
    if (!name) return;

    hasAutoResolved.current = true;
    const timer = setTimeout(() => {
      void resolveBusinessToMember(name);
    }, 300);
    return () => clearTimeout(timer);
  }, [businessNameParam, resolveBusinessToMember]);

  const fetchClients = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", "0");
      if (searchDebounced.trim()) params.set("query", searchDebounced.trim());
      if (filterStage) params.set("stage", filterStage);
      if (filterCreatedAfter) params.set("created_after", filterCreatedAfter);
      if (filterCreatedBefore) params.set("created_before", filterCreatedBefore);
      if (filterMine) params.set("mine", "1");
      if (filterSignedNotPromoted) params.set("signed_not_promoted", "1");
      if (filterEntityGroup) params.set("entity_group", filterEntityGroup);
      const url = `${getApiBaseUrl()}/api/clients?${params.toString()}`;

      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.status === 401) {
        setError("Authentication required. Please sign in again.");
        setClients([]);
        setTotalClients(0);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || data.message || "Failed to load members");
      }

      const data = await res.json();
      if (Array.isArray(data)) {
        setClients(data);
        setTotalClients(data.length);
      } else if (data && typeof data.items !== "undefined" && typeof data.total === "number") {
        setClients(Array.isArray(data.items) ? data.items : []);
        setTotalClients(data.total);
      } else {
        setClients([]);
        setTotalClients(0);
      }

      const countsRes = await fetch(`${getApiBaseUrl()}/api/reports/clients/offer-counts`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (countsRes.ok) {
        const counts: Record<string, number> = await countsRes.json();
        setOfferCountByClientId(counts);
      } else {
        setOfferCountByClientId({});
      }
    } catch (e: unknown) {
      console.error("Error fetching clients", e);
      setError(e instanceof Error ? e.message : "Failed to load members");
      setClients([]);
      setTotalClients(0);
    } finally {
      setLoading(false);
    }
  }, [
    token,
    searchDebounced,
    filterStage,
    filterCreatedAfter,
    filterCreatedBefore,
    filterMine,
    filterSignedNotPromoted,
    filterEntityGroup,
  ]);

  useEffect(() => {
    void fetchClients();
  }, [fetchClients]);

  const loadMoreClients = async () => {
    if (!token || loadingMore || clients.length >= totalClients) return;
    try {
      setLoadingMore(true);
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(clients.length));
      if (searchDebounced.trim()) params.set("query", searchDebounced.trim());
      if (filterStage) params.set("stage", filterStage);
      if (filterCreatedAfter) params.set("created_after", filterCreatedAfter);
      if (filterCreatedBefore) params.set("created_before", filterCreatedBefore);
      if (filterMine) params.set("mine", "1");
      if (filterSignedNotPromoted) params.set("signed_not_promoted", "1");
      if (filterEntityGroup) params.set("entity_group", filterEntityGroup);
      const res = await fetch(`${getApiBaseUrl()}/api/clients?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to load more");
      const data = await res.json();
      const nextItems = Array.isArray(data?.items) ? data.items : [];
      setClients((prev) => [...prev, ...nextItems]);
    } catch (e) {
      console.error("Load more clients", e);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !addClientForm.business_name.trim()) return;
    setAddClientSubmitting(true);
    setAddClientError(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/clients`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          business_name: addClientForm.business_name.trim(),
          primary_contact_email: addClientForm.primary_contact_email.trim() || undefined,
          stage: addClientForm.stage || "lead",
          owner_email: addClientForm.owner_email.trim() || undefined,
          entity_group_id: addClientForm.entity_group_id
            ? parseInt(addClientForm.entity_group_id, 10)
            : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to create member");
      }
      const created: Client = await res.json();
      setAddClientOpen(false);
      setAddClientForm({
        business_name: "",
        primary_contact_email: "",
        stage: "lead",
        owner_email: "",
        entity_group_id: "",
      });
      setClients((prev) => [created, ...prev]);
      window.location.href = `/crm-members/${created.id}`;
    } catch (err: any) {
      setAddClientError(err.message || "Failed to create member");
    } finally {
      setAddClientSubmitting(false);
    }
  };

  const groupedByStage = useMemo(() => {
    const groups: Record<string, Client[]> = {};
    for (const c of clients) {
      const s = (c.stage || "lead") as string;
      if (!groups[s]) groups[s] = [];
      groups[s].push(c);
    }
    for (const s of Object.keys(groups)) {
      groups[s].sort((a, b) => a.business_name.localeCompare(b.business_name));
    }
    return groups;
  }, [clients]);

  const pipelineSections = useMemo(() => {
    const known = CLIENT_STAGES.filter((stage) => groupedByStage[stage]?.length).map(
      (stage) => [stage, groupedByStage[stage] || []] as const
    );
    const extra = Object.keys(groupedByStage)
      .filter((s) => !CLIENT_STAGES.includes(s as ClientStage))
      .sort()
      .map((stage) => [stage, groupedByStage[stage] || []] as const);
    return [...known, ...extra];
  }, [groupedByStage]);

  const toggleSelectClient = (id: number | string) => {
    const numericId = Number(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(numericId)) next.delete(numericId);
      else next.add(numericId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === clients.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(clients.map((c) => Number(c.id))));
  };

  const handleBulkAssignOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || selectedIds.size === 0) return;
    const email = bulkOwnerEmail.trim();
    if (!email) return;
    setBulkOwnerSubmitting(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/client-bulk-update`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_ids: Array.from(selectedIds),
          owner_email: email,
        }),
      });
      if (!res.ok) throw new Error("Failed to update owners");
      const updated: Client[] = await res.json();
      setClients((prev) =>
        prev.map((c) => {
          const u = updated.find((x) => x.id === c.id);
          return u ? { ...c, owner_email: u.owner_email } : c;
        })
      );
      setBulkOwnerOpen(false);
      setBulkOwnerEmail("");
      setSelectedIds(new Set());
      setSelectMode(false);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to update owners");
    } finally {
      setBulkOwnerSubmitting(false);
    }
  };

  const handleBulkPromoteToExisting = async () => {
    if (!token || selectedIds.size === 0) return;
    const clientIds = Array.from(selectedIds).map((id) => Number(id));
    setBulkPromoteSubmitting(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/client-bulk-update`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_ids: clientIds,
          stage: "existing_client",
        }),
      });
      if (!res.ok) {
        let message = "Failed to promote members";
        try {
          const text = await res.text();
          const parsed = text ? JSON.parse(text) : null;
          if (parsed?.detail) message = typeof parsed.detail === "string" ? parsed.detail : message;
        } catch {
          // ignore
        }
        throw new Error(message);
      }
      const updated: Client[] = await res.json();
      setClients((prev) =>
        prev.map((c) => {
          const u = updated.find((x) => x.id === c.id);
          return u ? { ...c, stage: u.stage } : c;
        })
      );
      setBulkPromoteOpen(false);
      setSelectedIds(new Set());
      setSelectMode(false);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to promote members");
    } finally {
      setBulkPromoteSubmitting(false);
    }
  };

  const handleSyncSignedContracts = async () => {
    if (!token || !isAcesStaff) return;
    setSyncSubmitting(true);
    setSyncSummary(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/admin/sync-signed-contracts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { detail?: string }).detail || "Sync failed");
      }
      const data = await res.json();
      setSyncSummary(
        `Synced ${data.meta?.clients_updated ?? "?"} clients — ` +
          `${data.total_flagged ?? 0} signed via ACES, ` +
          `${data.signed_but_lead_or_qualified ?? 0} signed but not promoted ` +
          `(+${data.newly_flagged ?? 0} newly flagged)`
      );
      await fetchClients();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to sync signed status");
    } finally {
      setSyncSubmitting(false);
    }
  };

  const handleBulkUpdateStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || selectedIds.size === 0) return;
    const stage = bulkStage;
    if (!stage) return;
    const clientIds = Array.from(selectedIds).map((id) => Number(id));
    setBulkStageSubmitting(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/client-bulk-update`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_ids: clientIds,
          stage,
        }),
      });
      if (!res.ok) {
        let message = "Failed to update status";
        try {
          const text = await res.text();
          const parsed = text ? JSON.parse(text) : null;
          if (parsed?.detail) message = typeof parsed.detail === "string" ? parsed.detail : message;
        } catch {
          // ignore
        }
        throw new Error(message);
      }
      const updated: Client[] = await res.json();
      setClients((prev) =>
        prev.map((c) => {
          const u = updated.find((x) => x.id === c.id);
          return u ? { ...c, stage: u.stage } : c;
        })
      );
      setBulkStageOpen(false);
      setSelectedIds(new Set());
      setSelectMode(false);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setBulkStageSubmitting(false);
    }
  };

  const handleDeleteSelectedClients = async () => {
    if (!token || selectedIds.size === 0) return;
    setDeleteSubmitting(true);
    setDeleteError(null);
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(`${getApiBaseUrl()}/api/clients/${id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(
              typeof data.detail === "string"
                ? data.detail
                : `Failed to delete member ${id}`
            );
          }
        })
      );
      setClients((prev) => prev.filter((c) => !selectedIds.has(c.id)));
      setTotalClients((prev) => Math.max(0, prev - selectedIds.size));
      setSelectedIds(new Set());
      setSelectMode(false);
      setDeleteConfirmOpen(false);
    } catch (err: unknown) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete selected members"
      );
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleRowStageChange = async (clientId: number, newStage: ClientStage) => {
    if (!token) return;
    setRowStageSubmitting(true);
    setRowStageClientId(clientId);
    setRowMenuClientId(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/clients/${clientId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ stage: newStage }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { detail?: string }).detail || "Failed to update stage");
      }
      const updated: Client = await res.json();
      setClients((prev) =>
        prev.map((c) => (c.id === clientId ? { ...c, stage: updated.stage } : c))
      );
      setRowStageClientId(null);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to update stage");
      setRowStageClientId(null);
    } finally {
      setRowStageSubmitting(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setSearchDebounced("");
    setFilterStage("");
    setFilterCreatedAfter("");
    setFilterCreatedBefore("");
    setFilterMine(false);
    setFilterSignedNotPromoted(false);
    setFilterEntityGroup("");
    setLegacyLookupExpanded(false);
  };

  const handleDateRangeChange = useCallback((after: string, before: string) => {
    setFilterCreatedAfter(after);
    setFilterCreatedBefore(before);
  }, []);

  const legacyLookupQuery =
    businessNameParam?.trim() || searchDebounced.trim() || "";

  const renderClientRow = (client: Client) => {
    const offerCount = offerCountByClientId[String(client.id)] ?? 0;
    const isSelected = selectedIds.has(Number(client.id));
    const isChangingStage =
      rowStageSubmitting && rowStageClientId === client.id;

    return (
      <div
        key={client.id}
        className={cn(
          "group/row flex items-stretch border-b border-gray-100 last:border-b-0 dark:border-gray-800/60",
          isSelected && "bg-primary/5 dark:bg-primary/10"
        )}
      >
        <div
          className={cn(
            "flex w-9 shrink-0 items-center justify-center pl-2 transition-opacity",
            selectMode || isSelected
              ? "opacity-100"
              : "opacity-0 group-hover/row:opacity-100"
          )}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleSelectClient(client.id)}
            onClick={(e) => e.stopPropagation()}
            className="rounded border-gray-300 text-primary focus:ring-primary dark:border-gray-600"
            aria-label={`Select ${client.business_name}`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <RecordRow
            leading={
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold",
                  getStageAvatarClass(client.stage)
                )}
              >
                {getMemberInitials(client.business_name)}
              </div>
            }
            title={client.business_name}
            subtitle={
              <span className="flex flex-wrap items-center gap-2">
                {client.primary_contact_email ? (
                  <span className="truncate">{client.primary_contact_email}</span>
                ) : null}
                {offerCount > 0 ? (
                  <Badge intent="neutral" shape="pill" className="text-[10px] py-0">
                    {offerCount} offer{offerCount !== 1 ? "s" : ""}
                  </Badge>
                ) : null}
                {isSignedNotPromoted(client) ? (
                  <Badge intent="warning" shape="pill" className="text-[10px] py-0">
                    Signed — not promoted
                  </Badge>
                ) : null}
                {client.entity_group_display_name ? (
                  <Badge intent="neutral" shape="pill" className="text-[10px] py-0">
                    {client.entity_group_display_name}
                  </Badge>
                ) : null}
              </span>
            }
            status={<StageBadge stage={client.stage} />}
            onClick={() => router.push(`/crm-members/${client.id}`)}
            actions={
              <div
                className={cn(
                  "flex items-center gap-1 transition-opacity",
                  "opacity-0 group-hover/row:opacity-100 focus-within:opacity-100"
                )}
              >
                <Link
                  href={`/crm-members/${client.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="record-row-open inline-flex shrink-0 items-center rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                >
                  Open
                </Link>
                {client.gdrive_folder_url ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(client.gdrive_folder_url!, "_blank", "noreferrer");
                    }}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                    title="Open Drive"
                  >
                    <FolderOpen className="size-3.5" aria-hidden />
                    Drive
                  </button>
                ) : null}
                <div onClick={(e) => e.stopPropagation()}>
                <Dropdown
                  isOpen={rowMenuClientId === client.id}
                  setIsOpen={(open) => {
                    const next =
                      typeof open === "function"
                        ? open(rowMenuClientId === client.id)
                        : open;
                    setRowMenuClientId(next ? client.id : null);
                  }}
                >
                  <DropdownTrigger className="inline-flex size-7 items-center justify-center rounded-md border border-gray-200 bg-white text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800">
                    ⋯
                  </DropdownTrigger>
                  <DropdownContent
                    align="end"
                    className="min-w-[10rem] rounded-lg border border-stroke bg-white py-1 shadow-lg dark:border-dark-3 dark:bg-gray-dark"
                  >
                    <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                      Change stage
                    </p>
                    {CLIENT_STAGES.map((s) => (
                      <DropdownClose key={s}>
                        <button
                          type="button"
                          disabled={isChangingStage}
                          onClick={() => handleRowStageChange(client.id, s)}
                          className={cn(
                            "w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-dark-2",
                            client.stage === s && "font-semibold text-primary"
                          )}
                        >
                          {CLIENT_STAGE_LABELS[s]}
                        </button>
                      </DropdownClose>
                    ))}
                  </DropdownContent>
                </Dropdown>
                </div>
              </div>
            }
          />
        </div>
      </div>
    );
  };

  return (
    <>
      <PageHeader
        pageName="Members"
        description="Browse and open member records across the pipeline."
      />
      <div className="mt-4 space-y-5">
        {lookupLoading && businessNameParam?.trim() ? (
          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
            <Search className="size-4 shrink-0 text-primary" aria-hidden />
            Resolving &ldquo;{businessNameParam.trim()}&rdquo;…
          </div>
        ) : null}

        <RecentMembersRow
          items={recentMembers}
          onSelect={handleRecentSelect}
          loading={lookupLoading}
        />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <SegmentedControl
            options={[
              { value: "pipeline", label: "By stage" },
              { value: "flat", label: "All members" },
            ]}
            value={viewMode}
            onChange={setViewMode}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search by business name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              wrapperClassName="w-full sm:w-56"
              className="py-2"
            />
            <Dropdown isOpen={filtersOpen} setIsOpen={setFiltersOpen}>
              <DropdownTrigger
                className={cn(
                  "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                  activeFilterCount > 0
                    ? "border-primary/40 bg-primary/5 text-primary dark:border-primary/50"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                )}
              >
                <Filter className="size-4" aria-hidden />
                Filters
                {activeFilterCount > 0 ? (
                  <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                ) : null}
              </DropdownTrigger>
              <DropdownContent
                align="end"
                className="w-72 rounded-xl border border-stroke bg-white p-4 shadow-lg dark:border-dark-3 dark:bg-gray-dark"
              >
                <div className="space-y-4">
                  <Select
                    label="Stage"
                    value={filterStage}
                    onChange={(e) => setFilterStage(e.target.value)}
                  >
                    <option value="">All stages</option>
                    {CLIENT_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {CLIENT_STAGE_LABELS[s]}
                      </option>
                    ))}
                  </Select>
                  <DateRangeFilter
                    createdAfter={filterCreatedAfter}
                    createdBefore={filterCreatedBefore}
                    onChange={handleDateRangeChange}
                  />
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filterMine}
                      onChange={(e) => setFilterMine(e.target.checked)}
                      className="rounded border-gray-300 text-primary focus:ring-primary dark:border-gray-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">My clients</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filterSignedNotPromoted}
                      onChange={(e) => setFilterSignedNotPromoted(e.target.checked)}
                      className="rounded border-gray-300 text-primary focus:ring-primary dark:border-gray-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Signed but not promoted
                    </span>
                  </label>
                  <Select
                    label="Entity group"
                    value={filterEntityGroup}
                    onChange={(e) => setFilterEntityGroup(e.target.value)}
                  >
                    <option value="">All groups</option>
                    {entityGroupOptions.map((g) => (
                      <option key={g.id} value={g.slug}>
                        {g.display_name}
                      </option>
                    ))}
                  </Select>
                  {activeFilterCount > 0 ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setFilterStage("");
                        setFilterCreatedAfter("");
                        setFilterCreatedBefore("");
                        setFilterMine(false);
                        setFilterSignedNotPromoted(false);
                        setFilterEntityGroup("");
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : null}
                </div>
              </DropdownContent>
            </Dropdown>
            <Button
              type="button"
              variant={selectMode ? "primary" : "secondary"}
              size="sm"
              onClick={() => {
                setSelectMode((v) => !v);
                if (selectMode) setSelectedIds(new Set());
              }}
            >
              {selectMode ? "Done selecting" : "Select"}
            </Button>
            {isAcesStaff ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={syncSubmitting}
                disabled={syncSubmitting}
                onClick={() => void handleSyncSignedContracts()}
              >
                Sync signed status
              </Button>
            ) : null}
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                if (!token) return;
                const params = new URLSearchParams();
                if (searchDebounced.trim()) params.set("query", searchDebounced.trim());
                if (filterStage) params.set("stage", filterStage);
                if (filterCreatedAfter) params.set("created_after", filterCreatedAfter);
                if (filterCreatedBefore) params.set("created_before", filterCreatedBefore);
                if (filterMine) params.set("mine", "1");
                if (filterEntityGroup) params.set("entity_group", filterEntityGroup);
                const url = `${getApiBaseUrl()}/api/clients/export?${params.toString()}`;
                const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
                if (!res.ok) return;
                const blob = await res.blob();
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "members_export.csv";
                a.click();
                URL.revokeObjectURL(a.href);
              }}
            >
              Export CSV
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setAddClientOpen(true);
                setAddClientForm({
                  business_name: "",
                  primary_contact_email: "",
                  stage: "lead",
                  owner_email: (session as { user?: { email?: string } })?.user?.email ?? "",
                  entity_group_id: "",
                });
              }}
            >
              Add client
            </Button>
          </div>
        </div>

        {showLegacyLookup ? (
          <Card>
            <CardContent className="space-y-3 pt-5">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Resolve a business that isn&apos;t in the CRM yet — opens the member profile when
                saved, otherwise the legacy business-info view.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <Input
                  label="Business lookup"
                  value={legacyLookupQuery}
                  readOnly
                  wrapperClassName="min-w-0 flex-1"
                />
                <Button
                  onClick={() => void resolveBusinessToMember(legacyLookupQuery)}
                  loading={lookupLoading}
                  disabled={lookupLoading || !legacyLookupQuery.trim()}
                  leftIcon={<Search className="size-4" />}
                >
                  Resolve
                </Button>
              </div>
              {lookupError ? (
                <p className="text-xs text-red-600 dark:text-red-400">{lookupError}</p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {addClientOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            role="dialog"
            aria-modal="true"
          >
            <div className="mx-2 w-full max-w-md rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-900">
              <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-100">
                Add client
              </h3>
              <form onSubmit={handleAddClient} className="space-y-3">
                <Input
                  label="Business name *"
                  required
                  value={addClientForm.business_name}
                  onChange={(e) =>
                    setAddClientForm((f) => ({ ...f, business_name: e.target.value }))
                  }
                />
                <Input
                  label="Primary contact email"
                  type="email"
                  value={addClientForm.primary_contact_email}
                  onChange={(e) =>
                    setAddClientForm((f) => ({ ...f, primary_contact_email: e.target.value }))
                  }
                />
                <Select
                  label="Stage"
                  value={addClientForm.stage}
                  onChange={(e) =>
                    setAddClientForm((f) => ({ ...f, stage: e.target.value as ClientStage }))
                  }
                >
                  {CLIENT_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {CLIENT_STAGE_LABELS[s]}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Owner email"
                  type="email"
                  value={addClientForm.owner_email}
                  onChange={(e) =>
                    setAddClientForm((f) => ({ ...f, owner_email: e.target.value }))
                  }
                  hint="Current user if left blank"
                />
                <Select
                  label="Commercial entity group (optional)"
                  value={addClientForm.entity_group_id}
                  onChange={(e) =>
                    setAddClientForm((f) => ({ ...f, entity_group_id: e.target.value }))
                  }
                >
                  <option value="">— None —</option>
                  {entityGroupOptions.map((g) => (
                    <option key={g.id} value={String(g.id)}>
                      {g.display_name}
                    </option>
                  ))}
                </Select>
                {addClientError ? (
                  <p className="text-sm text-red-600 dark:text-red-400">{addClientError}</p>
                ) : null}
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setAddClientOpen(false);
                      setAddClientError(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" loading={addClientSubmitting} disabled={addClientSubmitting}>
                    {addClientSubmitting ? "Creating…" : "Create"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {syncSummary ? (
          <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
            {syncSummary}
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {selectedIds.size > 0 ? (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 dark:bg-primary/10">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {selectedIds.size} selected
            </span>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={selectedIds.size === clients.length}
                onChange={toggleSelectAll}
                className="rounded border-gray-300 text-primary focus:ring-primary dark:border-gray-600"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">Select all on page</span>
            </label>
            <Button type="button" size="sm" onClick={() => setBulkOwnerOpen(true)}>
              Assign owner
            </Button>
            {selectMode || filterSignedNotPromoted ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setBulkPromoteOpen(true)}
              >
                Promote to Existing Member
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setBulkStage("lead");
                setBulkStageOpen(true);
              }}
            >
              Change status
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/20"
              onClick={() => {
                setDeleteError(null);
                setDeleteConfirmOpen(true);
              }}
            >
              Delete
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setSelectedIds(new Set());
                setSelectMode(false);
              }}
            >
              Clear selection
            </Button>
          </div>
        ) : null}

        {bulkOwnerOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            role="dialog"
            aria-modal="true"
          >
            <div className="mx-2 w-full max-w-md rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-900">
              <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-100">
                Assign owner to {selectedIds.size} clients
              </h3>
              <form onSubmit={handleBulkAssignOwner} className="space-y-3">
                <Input
                  label="Owner email"
                  type="email"
                  value={bulkOwnerEmail}
                  onChange={(e) => setBulkOwnerEmail(e.target.value)}
                  placeholder="user@acesolutions.com.au"
                  required
                />
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setBulkOwnerOpen(false);
                      setBulkOwnerEmail("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" loading={bulkOwnerSubmitting} disabled={bulkOwnerSubmitting}>
                    {bulkOwnerSubmitting ? "Saving…" : "Assign"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {bulkPromoteOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            role="dialog"
            aria-modal="true"
          >
            <div className="mx-2 w-full max-w-md rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-900">
              <h3 className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
                Promote {selectedIds.size} member{selectedIds.size === 1 ? "" : "s"} to Existing
                Member?
              </h3>
              <p className="mb-3 text-xs text-gray-600 dark:text-gray-400">
                This updates the CRM stage to Existing Member for the selected records only. Signed
                contract flags are unchanged.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setBulkPromoteOpen(false)}
                  disabled={bulkPromoteSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleBulkPromoteToExisting()}
                  loading={bulkPromoteSubmitting}
                  disabled={bulkPromoteSubmitting}
                >
                  {bulkPromoteSubmitting ? "Promoting…" : "Promote"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {bulkStageOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            role="dialog"
            aria-modal="true"
          >
            <div className="mx-2 w-full max-w-md rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-900">
              <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-100">
                Change status for {selectedIds.size} member
                {selectedIds.size === 1 ? "" : "s"}
              </h3>
              <form onSubmit={handleBulkUpdateStage} className="space-y-3">
                <Select
                  label="Select status"
                  value={bulkStage}
                  onChange={(e) => setBulkStage(e.target.value as ClientStage)}
                >
                  {(["lead", "qualified"] as ClientStage[]).map((s) => (
                    <option key={s} value={s}>
                      {CLIENT_STAGE_LABELS[s]}
                    </option>
                  ))}
                </Select>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setBulkStageOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" loading={bulkStageSubmitting} disabled={bulkStageSubmitting}>
                    {bulkStageSubmitting ? "Saving…" : "Update status"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {deleteConfirmOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            role="dialog"
            aria-modal="true"
          >
            <div className="mx-2 w-full max-w-md rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-900">
              <h3 className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
                Delete {selectedIds.size} member{selectedIds.size === 1 ? "" : "s"}?
              </h3>
              <p className="mb-3 text-xs text-gray-600 dark:text-gray-400">
                This will remove the selected member records from the CRM, including their offers,
                tasks, and status notes. This action cannot be undone.
              </p>
              {deleteError ? (
                <p className="mb-2 text-xs text-red-600 dark:text-red-400">{deleteError}</p>
              ) : null}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (deleteSubmitting) return;
                    setDeleteConfirmOpen(false);
                    setDeleteError(null);
                  }}
                  disabled={deleteSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                  onClick={handleDeleteSelectedClients}
                  loading={deleteSubmitting}
                  disabled={deleteSubmitting}
                >
                  {deleteSubmitting ? "Deleting…" : "Delete"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {loading ? (
          <Card className="overflow-hidden p-0">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <Skeleton className="size-8 rounded-md" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </Card>
        ) : clients.length === 0 ? (
          <Card className="overflow-hidden">
            <EmptyState
              icon={
                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Users className="size-6" aria-hidden />
                </div>
              }
              title="No members match your filters"
              description={
                showLegacyLookupAfterEmptySearch
                  ? undefined
                  : "Try adjusting your search or filters, or add a new client."
              }
              action={
                <div className="flex flex-col items-center gap-3">
                  {showLegacyLookupAfterEmptySearch ? (
                    <button
                      type="button"
                      onClick={() => {
                        setLegacyLookupExpanded(true);
                        void resolveBusinessToMember(searchDebounced);
                      }}
                      disabled={lookupLoading}
                      className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
                    >
                      {lookupLoading
                        ? "Resolving via business lookup…"
                        : "Not in the CRM yet? Resolve via business lookup →"}
                    </button>
                  ) : null}
                  <div className="flex flex-wrap justify-center gap-3">
                    <Button type="button" variant="secondary" onClick={clearFilters}>
                      Clear filters
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setAddClientOpen(true);
                        setAddClientForm({
                          business_name: "",
                          primary_contact_email: "",
                          stage: "lead",
                          owner_email: (session as any)?.user?.email ?? "",
                          entity_group_id: "",
                        });
                      }}
                    >
                      Add a client
                    </Button>
                  </div>
                </div>
              }
            />
          </Card>
        ) : (
          <div className="space-y-6">
            {(viewMode === "flat"
              ? [["all", [...clients].sort((a, b) => a.business_name.localeCompare(b.business_name))] as const]
              : pipelineSections
            ).map(([stage, list]) => (
              <section key={String(stage)}>
                {viewMode === "pipeline" ? (
                  <div
                    className={cn(
                      "sticky top-0 z-10 mb-1 border-l-4 bg-gray-1/95 py-2 pl-3 backdrop-blur-sm dark:bg-dark-1/95",
                      getStageSectionAccent(stage)
                    )}
                  >
                    <SectionHeader
                      title={
                        CLIENT_STAGE_LABELS[stage as ClientStage] ??
                        stage.replace(/_/g, " ")
                      }
                      badge={<CountBadge count={list.length} />}
                      as="h2"
                      titleClassName="uppercase tracking-wide text-gray-600 dark:text-gray-300"
                    />
                  </div>
                ) : null}
                <Card className="overflow-hidden p-0 ring-1 ring-gray-200/60 dark:ring-gray-700/50">
                  <div>{list.map((client) => renderClientRow(client))}</div>
                </Card>
              </section>
            ))}
            {clients.length < totalClients ? (
              <div className="flex justify-center pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={loadMoreClients}
                  loading={loadingMore}
                  disabled={loadingMore}
                >
                  {loadingMore
                    ? "Loading…"
                    : `Load more (${clients.length} of ${totalClients})`}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}
