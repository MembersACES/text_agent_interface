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

type AgreementType = {
  id: string;
  label: string;
  utility_type: string;
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
  to?: string;
  subject?: string;
  agreement_label?: string;
  n8n_mode?: string | null;
  filename?: string;
  detail?: string;
};

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
  const emailEditedRef = useRef(false);
  emailEditedRef.current = emailEdited;
  const defaultCopyRef = useRef({ subject: "", body: "" });

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : undefined),
    [token],
  );

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        const res = await fetch(`${getAutonomousApiBaseUrl()}/api/autonomous/agreement-followup/types`, {
          headers: authHeaders,
        });
        if (!res.ok) return;
        const data = await res.json();
        const items = asItems<AgreementType>(data.items ?? data);
        setTypes(items);
        if (!agreementType && items[0]) setAgreementType(items[0].id);
      } catch {
        /* ignore */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
      if (!token) return;

      void (async () => {
        try {
          const res = await fetch(`${getApiBaseUrl()}/api/offers?client_id=${hit.id}`, {
            headers: authHeaders,
          });
          const data = res.ok ? await res.json() : [];
          const list = asItems<OfferHit>(data);
          setOffers(list);
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
      if (offerId !== NEW_OFFER) fd.append("offer_id", offerId);
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

  return (
    <ToolPageLayout
      pageName="Agreement Follow Up"
      title="Agreement Follow Up"
      description="Email the member an agreement PDF, then let the autonomous sequence chase the signature. Edit the first email before it goes out; follow-ups reply on the same thread."
      width="lg"
    >
      <div className="space-y-5">
        <Card>
          <div className="space-y-4">
            <div className="relative">
              <Input
                label="CRM member"
                value={memberQuery}
                onChange={(e) => {
                  setMemberQuery(e.target.value);
                  setMember(null);
                  setResult(null);
                }}
                placeholder="Search by business name"
                autoComplete="off"
              />
              {memberHits.length > 0 && !member && (
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
              {searching && !member ? (
                <p className="mt-1 text-xs text-gray-500">Searching…</p>
              ) : null}
              {member ? (
                <p className="mt-1 text-xs text-gray-500">
                  Member #{member.id}
                  {member.stage ? ` · ${member.stage.replaceAll("_", " ")}` : ""}
                </p>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-dark dark:text-white">Offer</label>
              <select
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-dark dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                value={offerId}
                onChange={(e) => setOfferId(e.target.value)}
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
              </p>
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-dark dark:text-white">Agreement type</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {types.map((row) => (
                  <label
                    key={row.id}
                    className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${
                      agreementType === row.id
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="agreement_type"
                      className="mt-0.5"
                      checked={agreementType === row.id}
                      onChange={() => {
                        setAgreementType(row.id);
                        setEmailEdited(false);
                      }}
                    />
                    <span>
                      <span className="block font-medium text-gray-900 dark:text-white">{row.label}</span>
                      <span className="text-xs text-gray-500">{row.utility_type}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

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
                hint="Pulled from the member LOA. Edit if this send should greet someone else."
              />
            </div>
            <Input
              label="Contact phone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="Optional — used if a voice step is added later"
            />

            <div>
              <label className="mb-1 block text-sm font-medium text-dark dark:text-white">Agreement PDF</label>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-gray-700 hover:file:bg-gray-200 dark:text-gray-300 dark:file:bg-gray-800 dark:file:text-gray-200"
              />
              {file ? <p className="mt-1 text-xs text-gray-500">{file.name}</p> : null}
            </div>
          </div>
        </Card>

        {previewSubject || previewBody ? (
          <Card>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                First email
              </p>
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
            <div className="space-y-3">
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
                hint="Greeting uses first name only. The ACES team signature is appended automatically."
                className="min-h-[220px] font-sans"
              />
            </div>
            {previewBody.trim() ? (
              <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 px-3 py-3 dark:border-gray-800 dark:bg-gray-900/40">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  How it will look
                </p>
                <div
                  className="prose prose-sm max-w-none text-gray-700 dark:prose-invert dark:text-gray-200"
                  dangerouslySetInnerHTML={{ __html: bodyPreviewHtml(previewBody) }}
                />
                <p className="mt-3 text-xs text-gray-500">
                  Signature: The Team · Australian Circular Economy Solutions
                </p>
              </div>
            ) : null}
            <p className="mt-3 text-xs text-gray-500">
              This send attaches the PDF via n8n. Follow-ups (days 1, 3, 5, 7) reply on the same
              Gmail thread and do not re-attach. Edit those step prompts on{" "}
              <Link className="font-medium text-primary hover:underline" href="/autonomous-agent?tab=templates">
                Autonomous Agent → Sequence templates
              </Link>
              .
            </p>
          </Card>
        ) : null}

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        ) : null}

        {result?.ok ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            <p className="font-medium">
              Sent {result.agreement_label} to {result.to} and started run #{result.run_id}.
            </p>
            {result.n8n_mode === "placeholder" ? (
              <p className="mt-1 text-amber-800 dark:text-amber-200">
                n8n webhook is not set, so the PDF was not actually emailed. Add{" "}
                <code>N8N_AGREEMENT_FOLLOWUP_EMAIL_WEBHOOK_URL</code> on the backend.
              </p>
            ) : null}
            <p className="mt-2">
              <Link className="font-semibold text-primary hover:underline" href={`/autonomous-agent/${result.run_id}`}>
                Open autonomous run →
              </Link>
            </p>
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={openConfirm}
            disabled={loading || !member || !file || !agreementType}
          >
            {`Start follow-up${selectedLabel ? ` · ${selectedLabel}` : ""}`}
          </Button>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => {
          if (!loading) setConfirmOpen(false);
        }}
        title="Send agreement now?"
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
              {loading ? "Sending…" : "Send email & start sequence"}
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <p>
            This sends the first email immediately with the PDF attached. There is no draft inbox
            and no undo after Confirm.
          </p>
          <dl className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 dark:border-gray-700 dark:bg-gray-900/40">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">To</dt>
              <dd>{contactEmail.trim() || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Subject</dt>
              <dd>{previewSubject.trim() || "—"}</dd>
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
