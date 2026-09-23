"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { ToolPageLayout } from "@/components/Layouts/ToolPageLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { getApiBaseUrl, getAutonomousApiBaseUrl } from "@/lib/utils";
import { formatBackendErrorBody } from "@/lib/api-errors";
import { Check, FileUp, Plus, X } from "lucide-react";

type AgreementType = {
  id: string;
  label: string;
  utility_type: string;
  retailer?: string;
  default_subject?: string;
  default_body?: string;
  is_active?: boolean;
};

type MemberHit = {
  id: number;
  business_name: string;
  primary_contact_email?: string | null;
  stage?: string | null;
};

type OfferHit = {
  id: number;
  business_name?: string | null;
  utility_type?: string | null;
  utility_display?: string | null;
  status?: string;
  pipeline_stage?: string | null;
};

type StartResult = {
  ok?: boolean;
  run_id?: number;
  offer_id?: number;
  client_id?: number;
  created_offer?: boolean;
  test?: boolean;
  to?: string;
  subject?: string;
  agreement_label?: string;
  n8n_mode?: string | null;
  filename?: string;
  detail?: string;
  warning?: string | null;
  shared_thread_with_run_id?: number | null;
};

const DEFAULT_UTILITIES = [
  "C&I Gas",
  "C&I Electricity",
  "SME Gas",
  "SME Electricity",
  "Waste",
  "Oil",
  "DMA",
  "Other",
];

const NEW_OFFER = "new";

const FALLBACK_TYPES: AgreementType[] = [
  { id: "alinta_ci_gas", label: "Alinta C&I Gas", utility_type: "C&I Gas" },
  { id: "alinta_ci_electricity", label: "Alinta C&I Electricity", utility_type: "C&I Electricity" },
  { id: "alinta_sme_gas", label: "Alinta SME Gas", utility_type: "SME Gas" },
  { id: "alinta_sme_electricity", label: "Alinta SME Electricity", utility_type: "SME Electricity" },
];

function sessionToken(session: unknown): string {
  const s = session as { id_token?: string; accessToken?: string } | null;
  return s?.id_token || s?.accessToken || "";
}

function asItems<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: T[] }).items;
  }
  return [];
}

function offerLabel(offer: OfferHit): string {
  const util = offer.utility_display || offer.utility_type || "Offer";
  const stage = offer.pipeline_stage || offer.status || "";
  return `#${offer.id} · ${util}${stage ? ` · ${stage.replaceAll("_", " ")}` : ""}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function bodyPreviewHtml(body: string): string {
  return body
    .trim()
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((chunk) => `<p>${escapeHtml(chunk).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function AgreementFollowUpInner() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const token = sessionToken(session);
  const testMode = searchParams.get("test") === "1";

  const testHref = (on: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (on) params.set("test", "1");
    else params.delete("test");
    const q = params.toString();
    return q ? `?${q}` : "/autonomous-agent/agreement-follow-up";
  };

  const [types, setTypes] = useState<AgreementType[]>(FALLBACK_TYPES);
  const [agreementType, setAgreementType] = useState(FALLBACK_TYPES[0].id);
  const [memberQuery, setMemberQuery] = useState("");
  const [memberHits, setMemberHits] = useState<MemberHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [member, setMember] = useState<MemberHit | null>(null);
  const [offers, setOffers] = useState<OfferHit[]>([]);
  const [offerId, setOfferId] = useState<string>(NEW_OFFER);
  const [contactEmail, setContactEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewSubject, setPreviewSubject] = useState("");
  const [previewBody, setPreviewBody] = useState("");
  const [emailEdited, setEmailEdited] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StartResult | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [allTypes, setAllTypes] = useState<AgreementType[]>(FALLBACK_TYPES);
  const [utilityOptions, setUtilityOptions] = useState<string[]>(DEFAULT_UTILITIES);
  const [newLabel, setNewLabel] = useState("");
  const [newUtility, setNewUtility] = useState(DEFAULT_UTILITIES[0]);
  const [newRetailer, setNewRetailer] = useState("");
  const [savingType, setSavingType] = useState(false);
  const [typeError, setTypeError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [purging, setPurging] = useState(false);
  const offerTouchedRef = useRef(false);
  const emailEditedRef = useRef(false);
  emailEditedRef.current = emailEdited;
  const defaultCopyRef = useRef({ subject: "", body: "" });

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : undefined),
    [token],
  );

  const loadTypes = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(
        `${getAutonomousApiBaseUrl()}/api/autonomous/agreement-followup/types?include_inactive=true`,
        { headers: authHeaders },
      );
      if (!res.ok) return;
      const data = await res.json();
      const items = asItems<AgreementType>(data.items ?? data);
      if (Array.isArray(data.utility_types) && data.utility_types.length) {
        setUtilityOptions(data.utility_types.map(String));
      }
      setAllTypes(items);
      const active = items.filter((row) => row.is_active !== false);
      setTypes(active.length ? active : FALLBACK_TYPES);
      setAgreementType((current) => {
        if (current && active.some((row) => row.id === current)) return current;
        return active[0]?.id || current;
      });
    } catch {
      /* keep fallback */
    }
  }, [authHeaders, token]);

  useEffect(() => {
    void loadTypes();
  }, [loadTypes]);

  const selectMember = useCallback(
    async (hit: MemberHit, prefill?: { name?: string; email?: string; phone?: string }) => {
      setMember(hit);
      setMemberQuery(hit.business_name);
      setMemberHits([]);
      setContactEmail(prefill?.email || hit.primary_contact_email || "");
      setContactName(prefill?.name || "");
      setContactPhone(prefill?.phone || "");
      setEmailEdited(false);
      setConfirmOpen(false);
      setResult(null);
      setError(null);
      offerTouchedRef.current = false;
      setOfferId(NEW_OFFER);
      if (!token) return;

      void (async () => {
        try {
          const res = await fetch(`${getApiBaseUrl()}/api/offers?client_id=${hit.id}`, {
            headers: authHeaders,
          });
          const data = res.ok ? await res.json() : [];
          const list = asItems<OfferHit>(data);
          setOffers(list);
          if (offerTouchedRef.current) return;
          const preferred =
            list.find((o) =>
              ["engagement_form_signed", "contract_requested", "contract_received"].includes(
                o.pipeline_stage || "",
              ),
            ) || list[0];
          setOfferId(preferred ? String(preferred.id) : NEW_OFFER);
        } catch {
          setOffers([]);
          setOfferId(NEW_OFFER);
        }
      })();

      void (async () => {
        try {
          const res = await fetch(`${getApiBaseUrl()}/api/clients/${hit.id}/contact-defaults`, {
            headers: authHeaders,
          });
          if (!res.ok) return;
          const loa = (await res.json()) as {
            contact_name?: string;
            contact_email?: string;
            contact_phone?: string;
          };
          const name = String(loa.contact_name || "").trim();
          const email = String(loa.contact_email || "").trim();
          const phone = String(loa.contact_phone || "").trim();
          if (name) setContactName(name);
          if (email && !(prefill?.email || hit.primary_contact_email)) setContactEmail(email);
          if (phone) setContactPhone(phone);
        } catch {
          /* keep URL / CRM prefill */
        }
      })();
    },
    [authHeaders, token],
  );

  useEffect(() => {
    const clientIdRaw = searchParams.get("clientId") || searchParams.get("client_id");
    const offerIdRaw = searchParams.get("offerId") || searchParams.get("offer_id");
    const urlName = (searchParams.get("contactName") || searchParams.get("contact_name") || "").trim();
    const urlEmail = (searchParams.get("contactEmail") || searchParams.get("contact_email") || "").trim();
    const urlPhone = (searchParams.get("contactPhone") || searchParams.get("contact_phone") || "").trim();
    if (urlName) setContactName(urlName);
    if (urlEmail) setContactEmail(urlEmail);
    if (urlPhone) setContactPhone(urlPhone);
    if (!token || !clientIdRaw) return;
    const id = Number(clientIdRaw);
    if (!Number.isFinite(id)) return;
    void (async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/clients/${id}`, { headers: authHeaders });
        if (!res.ok) return;
        const c = (await res.json()) as MemberHit;
        await selectMember(c, { name: urlName, email: urlEmail, phone: urlPhone });
        if (offerIdRaw && Number.isFinite(Number(offerIdRaw))) {
          offerTouchedRef.current = true;
          setOfferId(String(Number(offerIdRaw)));
        }
      } catch {
        /* ignore */
      }
    })();
  }, [authHeaders, searchParams, selectMember, token]);

  useEffect(() => {
    if (!token || member) return;
    const q = memberQuery.trim();
    if (q.length < 2) {
      setMemberHits([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void (async () => {
        setSearching(true);
        try {
          const res = await fetch(
            `${getApiBaseUrl()}/api/clients?query=${encodeURIComponent(q)}&limit=8`,
            { headers: authHeaders },
          );
          if (!res.ok) return;
          setMemberHits(asItems<MemberHit>(await res.json()));
        } finally {
          setSearching(false);
        }
      })();
    }, 250);
    return () => window.clearTimeout(handle);
  }, [authHeaders, member, memberQuery, token]);

  useEffect(() => {
    if (!token || !agreementType) return;
    const handle = window.setTimeout(() => {
      void (async () => {
        const params = new URLSearchParams({
          agreement_type: agreementType,
          business_name: member?.business_name || "",
          contact_name: contactName,
        });
        try {
          const res = await fetch(
            `${getAutonomousApiBaseUrl()}/api/autonomous/agreement-followup/preview?${params}`,
            { headers: authHeaders },
          );
          if (!res.ok) return;
          const data = (await res.json()) as { subject?: string; body_text?: string; html?: string };
          const nextSubject = data.subject || "";
          const nextBody = data.body_text || "";
          defaultCopyRef.current = { subject: nextSubject, body: nextBody };
          if (!emailEditedRef.current) {
            setPreviewSubject(nextSubject);
            setPreviewBody(nextBody);
          }
        } catch {
          /* ignore */
        }
      })();
    }, 300);
    return () => window.clearTimeout(handle);
  }, [agreementType, authHeaders, contactName, member?.business_name, token]);

  const validateStart = (): boolean => {
    if (!token) {
      setError("Please sign in.");
      return false;
    }
    if (!member) {
      setError("Select a CRM member.");
      return false;
    }
    if (!agreementType) {
      setError("Select the agreement type.");
      return false;
    }
    if (!file) {
      setError("Upload the agreement PDF.");
      return false;
    }
    if (!contactEmail.trim()) {
      setError("Member email is required.");
      return false;
    }
    if (!previewSubject.trim()) {
      setError("Subject cannot be empty.");
      return false;
    }
    if (!previewBody.trim()) {
      setError("Email body cannot be empty.");
      return false;
    }
    setError(null);
    return true;
  };

  const openConfirm = () => {
    if (!validateStart()) return;
    setConfirmOpen(true);
  };

  const createType = async () => {
    if (!token || !newLabel.trim()) {
      setTypeError("Give the type a name, e.g. Origin C&I Gas.");
      return;
    }
    setSavingType(true);
    setTypeError(null);
    try {
      const res = await fetch(`${getAutonomousApiBaseUrl()}/api/autonomous/agreement-followup/types`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newLabel.trim(),
          utility_type: newUtility,
          retailer: newRetailer.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as AgreementType & { detail?: string };
      if (!res.ok) {
        setTypeError(formatBackendErrorBody(data) || data.detail || "Could not save type");
        return;
      }
      setNewLabel("");
      setNewRetailer("");
      await loadTypes();
      if (data.id) {
        setAgreementType(data.id);
        setEmailEdited(false);
      }
    } catch (err) {
      setTypeError(err instanceof Error ? err.message : "Could not save type");
    } finally {
      setSavingType(false);
    }
  };

  const setTypeActive = async (typeId: string, isActive: boolean) => {
    if (!token) return;
    setTypeError(null);
    try {
      const res = await fetch(
        `${getAutonomousApiBaseUrl()}/api/autonomous/agreement-followup/types/${encodeURIComponent(typeId)}`,
        {
          method: "PATCH",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: isActive }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setTypeError(formatBackendErrorBody(data) || "Could not update type");
        return;
      }
      await loadTypes();
    } catch (err) {
      setTypeError(err instanceof Error ? err.message : "Could not update type");
    }
  };

  const startFollowup = async () => {
    if (!validateStart() || !member || !file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("client_id", String(member.id));
      fd.append("agreement_type", agreementType);
      fd.append("contact_email", contactEmail.trim());
      fd.append("contact_name", contactName.trim());
      fd.append("contact_phone", contactPhone.trim());
      fd.append("subject", previewSubject.trim());
      fd.append("body_text", previewBody.trim());
      if (testMode) {
        fd.append("test_mode", "true");
      } else if (offerId !== NEW_OFFER) {
        fd.append("offer_id", offerId);
      }
      fd.append("file", file);
      const res = await fetch(`${getAutonomousApiBaseUrl()}/api/autonomous/agreement-followup/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = (await res.json().catch(() => ({}))) as StartResult;
      if (!res.ok) {
        setError(formatBackendErrorBody(data) || data.detail || `Start failed (${res.status})`);
        return;
      }
      setConfirmOpen(false);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Start failed");
    } finally {
      setLoading(false);
    }
  };

  const selectedLabel = types.find((t) => t.id === agreementType)?.label;
  const selectedType = types.find((t) => t.id === agreementType);
  const readyMember = Boolean(member);
  const readyEmail = Boolean(contactEmail.trim());
  const readyPdf = Boolean(file);
  const canSend = readyMember && readyEmail && readyPdf && Boolean(agreementType);

  const takePdf = (next: File | null | undefined) => {
    if (!next) return;
    if (next.type && next.type !== "application/pdf" && !next.name.toLowerCase().endsWith(".pdf")) {
      setError("Upload a PDF.");
      return;
    }
    setFile(next);
    setError(null);
  };

  const purgeTestStubs = async () => {
    if (!token) return;
    setPurging(true);
    setError(null);
    try {
      const res = await fetch(
        `${getAutonomousApiBaseUrl()}/api/autonomous/agreement-followup/test-stubs/purge`,
        { method: "POST", headers: authHeaders },
      );
      const data = (await res.json().catch(() => ({}))) as {
        offers?: number;
        runs?: number;
        detail?: string;
      };
      if (!res.ok) {
        setError(formatBackendErrorBody(data) || data.detail || "Could not purge test stubs");
        return;
      }
      setResult(null);
      setError(null);
      window.alert(`Removed ${data.runs ?? 0} test run(s) and ${data.offers ?? 0} stub offer(s).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not purge test stubs");
    } finally {
      setPurging(false);
    }
  };

  return (
    <ToolPageLayout
      pageName="Agreement Follow Up"
      title="Agreement Follow Up"
      description={
        testMode
          ? "TEST MODE — sends a real email, but uses a throwaway stub offer that never appears in the Offers pipeline."
          : "Send the agreement PDF now, then let the sequence chase the signature on the same thread. Edit the first email before it goes out."
      }
      width="2xl"
      actions={
        <Button
          type="button"
          variant="secondary"
          size="sm"
          leftIcon={<Plus className="size-3.5" />}
          onClick={() => setManageOpen(true)}
        >
          Add or edit agreement types
        </Button>
      }
    >
      {testMode ? (
        <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-semibold">Test mode</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-900/90 dark:text-amber-100/80">
            This is for inbox and sequence testing only. The send still goes to the member email you
            type, but the offer behind the run is a hidden stub (same hide rule as campaign rows).
            It will not appear on Offers and will not move a real pipeline.{" "}
            <Link className="font-semibold underline" href={testHref(false)}>
              Exit test mode
            </Link>
            {" · "}
            <button
              type="button"
              className="font-semibold underline disabled:opacity-40"
              onClick={() => void purgeTestStubs()}
              disabled={purging || !token}
            >
              {purging ? "Purging…" : "Purge test stubs"}
            </button>
          </p>
        </div>
      ) : (
        <p className="mb-4 text-xs text-gray-400">
          Testing the sequence without touching a real offer?{" "}
          <Link className="font-medium text-primary hover:underline" href={testHref(true)}>
            Open test mode
          </Link>
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start">
        <div className="space-y-5">
          <Card className="space-y-4 border border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">1 · Member</p>
              <h2 className="mt-1 text-base font-semibold text-dark dark:text-white">Who are we sending to?</h2>
            </div>
            {member ? (
              <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{member.business_name}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Member #{member.id}
                    {member.stage ? ` · ${member.stage.replaceAll("_", " ")}` : ""}
                    {offers.length ? ` · ${offers.length} offer${offers.length === 1 ? "" : "s"}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                  onClick={() => {
                    setMember(null);
                    setMemberQuery("");
                    setOffers([]);
                    setOfferId(NEW_OFFER);
                    offerTouchedRef.current = false;
                    setResult(null);
                  }}
                >
                  <X className="size-3.5" />
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  label="Search CRM members"
                  value={memberQuery}
                  onChange={(e) => {
                    setMemberQuery(e.target.value);
                    setMember(null);
                    setResult(null);
                  }}
                  placeholder="Search by business name"
                  autoComplete="off"
                />
                {memberHits.length > 0 && (
                  <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                    {memberHits.map((hit) => (
                      <li key={hit.id}>
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                          onClick={() => void selectMember(hit)}
                        >
                          <span className="font-medium text-gray-900 dark:text-white">{hit.business_name}</span>
                          {hit.primary_contact_email ? (
                            <span className="ml-2 text-xs text-gray-500">{hit.primary_contact_email}</span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {searching ? <p className="mt-1 text-xs text-gray-500">Searching…</p> : null}
              </div>
            )}

            {testMode ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
                <p className="font-medium text-amber-950 dark:text-amber-100">Throwaway test stub</p>
                <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-100/70">
                  No real offer is used. A hidden stub is created for this run only, then you can purge it.
                </p>
              </div>
            ) : (
            <div>
              <label className="mb-1 block text-sm font-medium text-dark dark:text-white">Offer</label>
              <select
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-dark dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                value={offerId}
                onChange={(e) => {
                  offerTouchedRef.current = true;
                  setOfferId(e.target.value);
                }}
                disabled={!member}
              >
                <option value={NEW_OFFER}>Create a new offer</option>
                {offers.map((offer) => (
                  <option key={offer.id} value={String(offer.id)}>
                    {offerLabel(offer)}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Prefer the offer that already has the signed engagement form / Alinta request.
                Create a new offer only when that pipeline should start from this send — it will stay
                selected even after offers finish loading.
              </p>
            </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Member email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="name@business.com"
              />
              <Input
                label="Contact name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="From LOA / member profile"
                hint="Greeting uses first name only."
              />
            </div>
            <Input
              label="Contact phone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="Optional — used if a voice step is added later"
            />
          </Card>

          <Card className="space-y-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">2 · Agreement</p>
                <h2 className="mt-1 text-base font-semibold text-dark dark:text-white">Type and PDF</h2>
              </div>
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => setManageOpen(true)}
              >
                Add or edit types
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {types.length === 0 ? (
                <p className="sm:col-span-2 text-sm text-gray-500">
                  No active agreement types. Use Add or edit agreement types to create one.
                </p>
              ) : null}
              {types.map((row) => {
                const selected = agreementType === row.id;
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => {
                      setAgreementType(row.id);
                      setEmailEdited(false);
                    }}
                    className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                      selected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-gray-200 hover:border-gray-300 dark:border-gray-700"
                    }`}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span>
                        <span className="block font-medium text-gray-900 dark:text-white">{row.label}</span>
                        <span className="mt-0.5 block text-xs text-gray-500">
                          {row.utility_type}
                          {row.retailer ? ` · ${row.retailer}` : ""}
                        </span>
                      </span>
                      {selected ? <Check className="mt-0.5 size-4 shrink-0 text-primary" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>

            <div>
              <p className="mb-1 text-sm font-medium text-dark dark:text-white">Agreement PDF</p>
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  takePdf(e.dataTransfer.files?.[0]);
                }}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
                  dragOver
                    ? "border-primary bg-primary/5"
                    : file
                      ? "border-emerald-300 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/20"
                      : "border-gray-300 hover:border-gray-400 dark:border-gray-600"
                }`}
              >
                <FileUp className="mb-2 size-6 text-gray-400" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                  {file ? file.name : "Drop the PDF here, or click to choose"}
                </span>
                <span className="mt-1 text-xs text-gray-500">PDF only · max 15 MB · attached on the first email</span>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="sr-only"
                  onChange={(e) => takePdf(e.target.files?.[0])}
                />
              </label>
            </div>
          </Card>
        </div>

        <div className="space-y-5 lg:sticky lg:top-24">
          <Card className="space-y-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">3 · First email</p>
                <h2 className="mt-1 text-base font-semibold text-dark dark:text-white">Edit before send</h2>
              </div>
              {emailEdited ? (
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline"
                  onClick={() => {
                    setPreviewSubject(defaultCopyRef.current.subject);
                    setPreviewBody(defaultCopyRef.current.body);
                    setEmailEdited(false);
                  }}
                >
                  Reset to default
                </button>
              ) : null}
            </div>
            <Input
              label="Subject"
              value={previewSubject}
              onChange={(e) => {
                setEmailEdited(true);
                setPreviewSubject(e.target.value);
              }}
            />
            <Textarea
              label="Body"
              value={previewBody}
              onChange={(e) => {
                setEmailEdited(true);
                setPreviewBody(e.target.value);
              }}
              rows={10}
              className="min-h-[220px] font-sans"
            />
            {previewBody.trim() ? (
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 dark:border-gray-800 dark:bg-gray-900/40">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  How it will look
                </p>
                <div
                  className="prose prose-sm max-w-none text-gray-700 dark:prose-invert dark:text-gray-200"
                  dangerouslySetInnerHTML={{ __html: bodyPreviewHtml(previewBody) }}
                />
                <p className="mt-3 text-xs text-gray-500">
                  Signature appended automatically · The Team, ACES
                </p>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Select a member and type to load the default email.</p>
            )}
          </Card>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-dark">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {testMode ? "Ready to send a test" : "Ready to send"}
            </p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {[
                { ok: readyMember, label: member ? member.business_name : "Pick a CRM member" },
                { ok: Boolean(selectedType), label: selectedLabel || "Choose an agreement type" },
                { ok: readyEmail, label: readyEmail ? contactEmail : "Member email required" },
                { ok: readyPdf, label: file ? file.name : "Attach the agreement PDF" },
                ...(testMode
                  ? [{ ok: true, label: "Throwaway stub offer (hidden from Offers)" }]
                  : []),
              ].map((item) => (
                <li key={item.label} className="flex items-start gap-2">
                  <Check className={`mt-0.5 size-4 shrink-0 ${item.ok ? "text-emerald-600" : "text-gray-300"}`} />
                  <span className={item.ok ? "text-gray-800 dark:text-gray-100" : "text-gray-400"}>{item.label}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-gray-500">
              Follow-ups on days 1, 3, 5 and 7 reply on the same Gmail thread.{" "}
              <Link className="font-medium text-primary hover:underline" href="/autonomous-agent/templates">
                Edit sequence copy
              </Link>
            </p>
            {error ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </p>
            ) : null}
            {result?.ok ? (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                <p className="font-medium">
                  {result.test ? "TEST · " : ""}
                  Sent {result.agreement_label} to {result.to} · run #{result.run_id}
                </p>
                <Link className="mt-1 inline-block font-semibold text-primary hover:underline" href={`/autonomous-agent/${result.run_id}`}>
                  Open run →
                </Link>
              </div>
            ) : null}
            {result?.ok && result.warning ? (
              <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                {result.warning}
              </p>
            ) : null}
            <Button
              type="button"
              className="mt-4 w-full"
              onClick={openConfirm}
              disabled={loading || !canSend}
            >
              {testMode
                ? `Send TEST ${selectedLabel || "agreement"}`
                : `Send ${selectedLabel || "agreement"} & start follow-up`}
            </Button>
          </div>
        </div>
      </div>

      <Modal
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        title="Add or edit agreement types"
        size="lg"
        footer={
          <div className="flex justify-end">
            <Button type="button" variant="secondary" onClick={() => setManageOpen(false)}>
              Done
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <p>
            Add Origin, Simply, or any other retailer agreement here. New types use the same PDF send
            and signing follow-up. You do not need a backend change.
          </p>
          <div className="space-y-2">
            {allTypes.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{row.label}</p>
                  <p className="text-xs text-gray-500">
                    {row.utility_type}
                    {row.retailer ? ` · ${row.retailer}` : ""}
                    {row.is_active === false ? " · hidden" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline"
                  onClick={() => void setTypeActive(row.id, row.is_active === false)}
                >
                  {row.is_active === false ? "Show" : "Hide"}
                </button>
              </div>
            ))}
          </div>
          <div className="space-y-3 rounded-lg border border-dashed border-gray-300 px-3 py-3 dark:border-gray-600">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Add a type</p>
            <Input
              label="Name"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Origin C&I Gas"
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-dark dark:text-white">Utility</label>
              <select
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-dark dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                value={newUtility}
                onChange={(e) => setNewUtility(e.target.value)}
              >
                {utilityOptions.map((utility) => (
                  <option key={utility} value={utility}>
                    {utility}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Retailer"
              value={newRetailer}
              onChange={(e) => setNewRetailer(e.target.value)}
              placeholder="Optional — Origin, Simply, Alinta…"
            />
            {typeError ? <p className="text-xs text-red-600">{typeError}</p> : null}
            <Button type="button" onClick={() => void createType()} loading={savingType}>
              {savingType ? "Saving…" : "Add type"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={confirmOpen}
        onClose={() => {
          if (!loading) setConfirmOpen(false);
        }}
        title={testMode ? "Send TEST agreement?" : "Send agreement now?"}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirmOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void startFollowup()} loading={loading}>
              {loading
                ? "Sending…"
                : testMode
                  ? "Send test email & start sequence"
                  : "Send email & start sequence"}
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <p>
            {testMode
              ? "This still sends a real email with the PDF. The offer behind the run is a hidden test stub — it will not show on Offers or move a real pipeline."
              : "This sends the first email immediately with the PDF attached. There is no draft inbox and no undo after Confirm."}
          </p>
          <dl className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 dark:border-gray-700 dark:bg-gray-900/40">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">To</dt>
              <dd>{contactEmail.trim() || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Subject</dt>
              <dd>
                {testMode && !previewSubject.trim().toUpperCase().startsWith("[TEST]")
                  ? `[TEST] ${previewSubject.trim() || "—"}`
                  : previewSubject.trim() || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Agreement</dt>
              <dd>
                {selectedLabel || agreementType}
                {file ? ` · ${file.name}` : ""}
              </dd>
            </div>
          </dl>
          <p className="text-xs text-gray-500">
            After this, the sequence keeps chasing on days 1, 3, 5 and 7 on the same Gmail thread
            unless they sign or you stop the run.
          </p>
          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          ) : null}
        </div>
      </Modal>
    </ToolPageLayout>
  );
}

export default function AgreementFollowUpPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading…</div>}>
      <AgreementFollowUpInner />
    </Suspense>
  );
}
