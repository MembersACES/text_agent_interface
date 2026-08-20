"use client";

import { useEffect, useState } from "react";
import { getApiBaseUrl, getAutonomousApiBaseUrl, cn } from "@/lib/utils";

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

/** 0401941385 → +61401941385 so Twilio/Retell can dial the test mobile. */
function toE164Au(raw: string): string {
  const text = raw.trim();
  if (!text) return "";
  const digits = text.replace(/\D/g, "");
  if (!digits) return "";
  if (text.startsWith("+")) return `+${digits}`;
  if (digits.startsWith("61") && digits.length >= 11) return `+${digits}`;
  if (digits.startsWith("0") && digits.length >= 9) return `+61${digits.slice(1)}`;
  if (digits.length === 9 && digits.startsWith("4")) return `+61${digits}`;
  return `+${digits}`;
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

  const submit = async () => {
    const oid = Number(offerId);
    if (!Number.isFinite(oid) || oid <= 0) {
      showToast("Pick an offer to attach this test run to.", "error");
      return;
    }
    if (!contactEmail.trim() || !contactPhone.trim()) {
      showToast("Enter your own email and phone so the test does not contact the client.", "error");
      return;
    }
    const e164 = toE164Au(contactPhone);
    setContactPhone(e164);
    setSubmitting(true);
    try {
      const tz =
        typeof Intl !== "undefined"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone || "Australia/Brisbane"
          : "Australia/Brisbane";
      const res = await fetch(`${getAutonomousApiBaseUrl()}/api/autonomous/sequences/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          sequence_type: sequenceType,
          offer_id: oid,
          client_id: selected?.client_id ?? undefined,
          anchor_at: new Date().toISOString(),
          timezone: tz,
          context: {
            dashboard_test: true,
            business_name: selected?.business_name,
            contact_name: contactName.trim(),
            contact_email: contactEmail.trim(),
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
            onChange={(e) => setContactEmail(e.target.value)}
            className={inputCls}
            placeholder="you@acesolutions.com.au"
          />
        </label>
        <label className={labelCls}>
          Your mobile
          <input
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            onBlur={() => {
              const next = toE164Au(contactPhone);
              if (next) setContactPhone(next);
            }}
            className={inputCls}
            placeholder="0401941385"
          />
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
