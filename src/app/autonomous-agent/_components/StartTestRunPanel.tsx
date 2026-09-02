"use client";

import { useEffect, useState } from "react";
import { getApiBaseUrl, getAutonomousApiBaseUrl, cn } from "@/lib/utils";
import { checkAuPhone } from "@/lib/au-phone";

interface OfferLite {
  id: number;
  client_id?: number | null;
  business_name?: string | null;
  utility_display?: string | null;
  identifier?: string | null;
}

interface StartTestRunPanelProps {
  token: string;
  sequenceType: string;
  displayName: string;
  onStarted: (runId: number) => void;
  showToast: (message: string, type?: "success" | "error" | "info" | "warning") => void;
}

function apiDetail(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "detail" in data) {
    const d = (data as { detail: unknown }).detail;
    if (typeof d === "string" && d.trim()) return d;
  }
  return fallback;
}

/** Permissive on the local part, strict on shape. */
function checkEmail(raw: string): { ok: true; value: string } | { ok: false; reason: string } {
  const value = raw.trim();
  if (!value) return { ok: false, reason: "Enter your email address." };
  if (!/^[^\s@]+@[^\s@,]+\.[^\s@,]{2,}$/.test(value)) {
    return { ok: false, reason: "That doesn't look like a valid email address." };
  }
  return { ok: true, value };
}

const COMPARISON_HINT: Record<string, string> = {
  gas_base2_followup_v1: "Base 2 — C&I Gas comparison",
  ci_electricity_base2_followup_v1: "Base 2 — C&I Electricity comparison",
  ci_electricity_offer: "Utility Invoice Info — C&I Electricity",
  bne_gas_base2_followup_v1: "Base 2 — B&E Gas comparison",
  solar_panel_cleaning_followup_v1: "Solar cleaning quote sent",
  solar_panel_cleaning_engagement_form_v1: "Document Generation — engagement form",
};

const inputCls =
  "mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-2.5 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40";
const labelCls = "block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide";
const errorInputCls = "border-red-400 dark:border-red-600 focus:ring-red-500/40";
const errorTextCls =
  "mt-1 block text-[11px] font-normal normal-case text-red-600 dark:text-red-400";
const btnPrimary =
  "inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-primary to-primary/85 text-white text-sm font-semibold px-4 py-2 transition hover:-translate-y-0.5 hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 shadow-sm";

export default function StartTestRunPanel({
  token,
  sequenceType,
  displayName,
  onStarted,
  showToast,
}: StartTestRunPanelProps) {
  const [offers, setOffers] = useState<OfferLite[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [offerId, setOfferId] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingOffers(true);
        const res = await fetch(`${getApiBaseUrl()}/api/offers?limit=30&offset=0`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(apiDetail(data, "Failed to load offers"));
        const rows = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
        setOffers(rows as OfferLite[]);
        if (rows[0]?.id) setOfferId(String(rows[0].id));
      } catch {
        setOffers([]);
      } finally {
        setLoadingOffers(false);
      }
    };
    load();
  }, [token]);

  const selected = offers.find((o) => String(o.id) === offerId) ?? null;
  const hint = COMPARISON_HINT[sequenceType];

  const phoneCheck = checkAuPhone(contactPhone);

  const submit = async () => {
    const oid = Number(offerId);
    if (!Number.isFinite(oid) || oid <= 0) {
      showToast("Pick an offer to attach this test run to.", "error");
      return;
    }

    const email = checkEmail(contactEmail);
    const phone = checkAuPhone(contactPhone);
    setEmailError(email.ok ? null : email.reason);
    setPhoneError(phone.ok ? null : phone.reason);
    if (!email.ok || !phone.ok) return;

    if (phone.kind === "landline") {
      showToast("That's a landline — the voice call will work but the SMS step won't.", "warning");
    }

    const e164 = phone.e164;
    setSubmitting(true);
    try {
      const res = await fetch(`${getAutonomousApiBaseUrl()}/api/autonomous/sequences/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          sequence_type: sequenceType,
          offer_id: oid,
          client_id: selected?.client_id ?? undefined,
          anchor_at: new Date().toISOString(),
          timezone: "Australia/Brisbane",
          context: {
            dashboard_test: true,
            business_name: selected?.business_name,
            contact_name: contactName.trim(),
            contact_email: email.value,
            contact_phone: e164,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(apiDetail(data, "Failed to start test run"));
      const runId = Number((data as { run_id?: number }).run_id);
      if (!Number.isFinite(runId)) throw new Error("Start succeeded but no run_id was returned");
      showToast(`Test run #${runId} scheduled for ${displayName}.`, "success");
      onStarted(runId);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to start test run", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20 p-4 space-y-3">
      <div>
        <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">Start a test run</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Creates a live schedule for this template and opens it so you can watch steps, send one now,
          then edit the prompt and try again. The first step is due immediately; later steps keep their
          gaps. This attaches to the selected offer for savings/site context — it does not copy the offer.
          {hint ? (
            <>
              {" "}
              Linked comparison: <span className="font-medium text-gray-700 dark:text-gray-200">{hint}</span>.
            </>
          ) : null}
        </p>
      </div>

      <label className={labelCls}>
        Offer to attach
        {loadingOffers ? (
          <p className="mt-2 text-sm text-gray-400">Loading recent offers…</p>
        ) : (
          <select value={offerId} onChange={(e) => setOfferId(e.target.value)} className={inputCls}>
            {offers.length === 0 && <option value="">No offers found</option>}
            {offers.map((o) => (
              <option key={o.id} value={o.id}>
                #{o.id} {o.business_name || "Untitled"} {o.utility_display ? `· ${o.utility_display}` : ""}{" "}
                {o.identifier ? `· ${o.identifier}` : ""}
              </option>
            ))}
          </select>
        )}
      </label>

      <p className="text-[11px] text-amber-800 dark:text-amber-200">
        Put <strong>your</strong> email and mobile below. Email, SMS and voice will use these, not the
        client on the offer.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className={labelCls}>
          Your name
          <input value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputCls} />
        </label>
        <label className={labelCls}>
          Your email
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => {
              setContactEmail(e.target.value);
              if (emailError) setEmailError(null);
            }}
            onBlur={() => {
              const r = checkEmail(contactEmail);
              setEmailError(contactEmail.trim() && !r.ok ? r.reason : null);
            }}
            className={cn(inputCls, emailError && errorInputCls)}
            placeholder="you@acesolutions.com.au"
          />
          {emailError && <span className={errorTextCls}>{emailError}</span>}
        </label>
        <label className={labelCls}>
          Your mobile
          <input
            type="tel"
            value={contactPhone}
            onChange={(e) => {
              setContactPhone(e.target.value);
              if (phoneError) setPhoneError(null);
            }}
            onBlur={() => {
              const r = checkAuPhone(contactPhone);
              setPhoneError(contactPhone.trim() && !r.ok ? r.reason : null);
            }}
            className={cn(inputCls, phoneError && errorInputCls)}
            placeholder="0401 941 385"
          />
          {phoneError ? (
            <span className={errorTextCls}>{phoneError}</span>
          ) : phoneCheck.ok ? (
            <span className="mt-1 block text-[11px] font-normal normal-case text-gray-500 dark:text-gray-400">
              Will dial {phoneCheck.e164}
              {phoneCheck.kind === "landline" ? " — landline, so no SMS" : ""}
            </span>
          ) : null}
        </label>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={submitting || loadingOffers || !offerId}
        className={cn(btnPrimary, "text-xs")}
      >
        {submitting ? "Starting…" : "Start test run"}
      </button>
    </div>
  );
}
