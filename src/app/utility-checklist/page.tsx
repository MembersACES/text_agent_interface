"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/Layouts/PageHeader";
import { Button } from "@/components/ui/button";
import { getApiBaseUrl } from "@/lib/utils";
import {
  accountsForFuel,
  definitionForFuel,
  findChecklist,
  fuelForUtilityType,
  FUEL_CHECKLIST_ID,
  groupLinkedAccounts,
  readChecklistSeed,
  toIsoDate,
  type ChecklistField,
  type ChecklistFuel,
  type ChecklistStatus,
  type LinkedAccount,
  type UtilityChecklistRecord,
} from "@/lib/utility-checklist";

const AUTOSAVE_MS = 1500;

type SaveIntent = {
  status: ChecklistStatus;
  answers: Record<string, unknown>;
};

async function fetchLinkedAccounts(
  token: string,
  businessName: string,
  fuel: ChecklistFuel,
): Promise<LinkedAccount[]> {
  const [infoRes, extraRes] = await Promise.all([
    fetch(`${getApiBaseUrl()}/api/get-business-info`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ business_name: businessName }),
    }),
    fetch(`${getApiBaseUrl()}/api/utility-extra?business_name=${encodeURIComponent(businessName)}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  ]);
  const info = infoRes.ok ? ((await infoRes.json()) as Record<string, unknown>) : {};
  const extra = extraRes.ok ? ((await extraRes.json()) as Record<string, unknown>) : {};
  const linked = { ...((info.Linked_Details as Record<string, unknown> | undefined) ?? {}) };
  for (const key of ["linked_utilities", "utility_retailers", "linked_utility_extra"] as const) {
    const incoming = extra[key];
    if (incoming && typeof incoming === "object" && Object.keys(incoming as object).length > 0) {
      linked[key] = incoming;
    }
  }
  return accountsForFuel({ ...info, Linked_Details: linked }, fuel);
}

function sameRetailer(sheetRetailer: string, airtableRetailer: string): boolean {
  const firstWord = (value: string) => (value.toLowerCase().match(/[a-z0-9]+/) || [""])[0];
  const left = firstWord(sheetRetailer);
  const right = firstWord(airtableRetailer);
  if (!left || !right) return true;
  return left === right || left.startsWith(right) || right.startsWith(left);
}

function memberSheetUrl(sheetId: string, gid: number | string | null | undefined): string {
  if (!sheetId) return "";
  const base = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
  if (gid === null || gid === undefined || gid === "") return base;
  return `${base}?gid=${gid}#gid=${gid}`;
}

function formatIsoDate(iso: string): string {
  if (!iso) return "";
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return iso;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function formatSaved(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" });
}

function fieldValue(answers: Record<string, unknown>, key: string): string {
  const value = answers[key];
  if (value == null) return "";
  return String(value);
}

function UtilityChecklistForm() {
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const token =
    (session as { id_token?: string; accessToken?: string } | null)?.id_token ??
    (session as { id_token?: string; accessToken?: string } | null)?.accessToken;

  const clientIdRaw = searchParams.get("clientId") ?? "";
  const fuelParam = (searchParams.get("fuel") ?? "").trim();
  const utilityType = (searchParams.get("utility") ?? "").trim();
  const businessName = (searchParams.get("businessName") ?? "").trim();
  const clientId = Number(clientIdRaw);
  const fuel: ChecklistFuel | null =
    fuelParam === "electricity" || fuelParam === "gas" ? fuelParam : fuelForUtilityType(utilityType);
  const definition = fuel ? definitionForFuel(fuel) : null;
  const readyParams = Number.isFinite(clientId) && clientId > 0 && !!fuel && businessName.length > 0;

  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [status, setStatus] = useState<ChecklistStatus>("draft");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [accountNote, setAccountNote] = useState<Record<string, string>>({});
  const [sheetByKey, setSheetByKey] = useState<
    Record<
      string,
      {
        sheetEnd: string;
        sheetEndRaw: string;
        sheetRetailer: string;
        sheetIdentifier: string;
        matchKind: string;
        tab: string;
        sheetUrl: string;
        error?: string;
      }
    >
  >({});
  const accountsRef = useRef<LinkedAccount[]>([]);
  const accountOriginalRef = useRef<LinkedAccount[]>([]);
  const touchedRef = useRef<Set<string>>(new Set());

  const answersRef = useRef(answers);
  const statusRef = useRef(status);
  const rowVersionRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);
  const queuedRef = useRef<SaveIntent | null>(null);
  const conflictRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const loadedRef = useRef(false);

  const applyRecord = useCallback((row: UtilityChecklistRecord | undefined) => {
    const nextAnswers =
      row && row.answers && typeof row.answers === "object" ? { ...row.answers } : {};
    const nextStatus: ChecklistStatus = row?.status === "complete" ? "complete" : "draft";
    answersRef.current = nextAnswers;
    statusRef.current = nextStatus;
    rowVersionRef.current = row ? row.row_version : null;
    setAnswers(nextAnswers);
    setStatus(nextStatus);
    setUpdatedAt(row?.updated_at ?? null);
  }, []);

  const load = useCallback(async () => {
    if (!token || !readyParams || !fuel) return;
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const seeded = readChecklistSeed(clientId, fuel);
    touchedRef.current.clear();
    if (seeded.length > 0) {
      accountsRef.current = seeded;
      accountOriginalRef.current = seeded.map((account) => ({ ...account }));
      setAccounts(seeded);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const checklistPromise = fetch(`${getApiBaseUrl()}/api/clients/${clientId}/utility-checklists`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const accountsPromise =
        seeded.length > 0
          ? Promise.resolve(seeded)
          : fetchLinkedAccounts(token, businessName, fuel);
      const [res, nextAccounts] = await Promise.all([checklistPromise, accountsPromise]);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { detail?: string }).detail || "Could not load the checklist");
      }
      const rows = (await res.json()) as UtilityChecklistRecord[];
      applyRecord(findChecklist(Array.isArray(rows) ? rows : [], fuel));
      if (seeded.length === 0) {
        accountsRef.current = nextAccounts;
        accountOriginalRef.current = nextAccounts.map((account) => ({ ...account }));
        setAccounts(nextAccounts);
        setAccountNote({});
      }
      conflictRef.current = false;
      setConflict(false);
      loadedRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the checklist");
    } finally {
      setLoading(false);
    }
  }, [applyRecord, businessName, clientId, fuel, readyParams, token]);

  const accountIdentity = accounts.map((account) => `${account.utilityType}:${account.identifier}`).join("|");

  useEffect(() => {
    if (!token || !fuel || !accountIdentity) {
      setSheetByKey({});
      return;
    }
    let cancelled = false;
    const groups = groupLinkedAccounts(accountsRef.current, fuel).filter(
      (group) => group.primary.utilityType === "C&I Gas" || group.primary.utilityType === "C&I Electricity",
    );
    if (groups.length === 0) {
      setSheetByKey({});
      return;
    }
    void (async () => {
      const next: typeof sheetByKey = {};
      try {
        const identifiers = groups.map((group) => group.primary.identifier).join(",");
        const res = await fetch(
          `${getApiBaseUrl()}/api/base2/bne-contract-checks?fuel=${fuel}&identifiers=${encodeURIComponent(identifiers)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        type SheetContractResult = {
          detail?: string;
          query_mrin?: string;
          query_nmi?: string;
          match_kind?: string;
          sheet_tab?: string;
          sheet_id?: string;
          sheet_gid?: number | string | null;
          contracts?: { contract_end_date?: string; retailer?: string; mrin?: string; nmi?: string }[];
        };
        const payload = (await res.json()) as {
          detail?: string;
          results?: SheetContractResult[];
        };
        if (res.status === 404) {
          payload.results = await Promise.all(
            groups.map(async (group) => {
              const isGas = group.primary.utilityType === "C&I Gas";
              const singleUrl = isGas
                ? `${getApiBaseUrl()}/api/base2/bne-gas-contract?mrin=${encodeURIComponent(group.primary.identifier)}`
                : `${getApiBaseUrl()}/api/base2/bne-electricity-contract?nmi=${encodeURIComponent(group.primary.identifier)}`;
              const single = await fetch(singleUrl, { headers: { Authorization: `Bearer ${token}` } });
              const body = (await single.json()) as SheetContractResult;
              if (!single.ok) throw new Error(body.detail || "Contract sheet lookup failed");
              return body;
            }),
          );
        } else if (!res.ok) {
          throw new Error(payload.detail || "Contract sheet lookup failed");
        }
        const byQuery = new Map<string, SheetContractResult>();
        for (const result of payload.results ?? []) {
          const query = String(result.query_mrin || result.query_nmi || "").trim().toUpperCase();
          if (query) byQuery.set(query, result);
        }
        for (const group of groups) {
          const key = `${group.primary.utilityType}:${group.primary.identifier}`;
          const result = byQuery.get(group.primary.identifier.trim().toUpperCase());
          const contract = result?.contracts?.[0];
          const raw = String(contract?.contract_end_date || "");
          next[key] = {
            sheetEnd: toIsoDate(raw),
            sheetEndRaw: raw,
            sheetRetailer: String(contract?.retailer || ""),
            sheetIdentifier: String(contract?.mrin || contract?.nmi || ""),
            matchKind: String(result?.match_kind || "none"),
            tab: String(result?.sheet_tab || ""),
            sheetUrl: memberSheetUrl(String(result?.sheet_id || ""), result?.sheet_gid),
          };
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Contract sheet lookup failed";
        for (const group of groups) {
          next[`${group.primary.utilityType}:${group.primary.identifier}`] = {
            sheetEnd: "",
            sheetEndRaw: "",
            sheetRetailer: "",
            sheetIdentifier: "",
            matchKind: "none",
            tab: "",
            sheetUrl: "",
            error: message,
          };
        }
      }
      if (!cancelled) setSheetByKey(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [accountIdentity, fuel, token]);

  useEffect(() => {
    if (!token || !fuel || !accountIdentity) return;
    let cancelled = false;
    const types = [...new Set(accountsRef.current.map((account) => account.utilityType))];
    void (async () => {
      const rows: {
        query?: string;
        identifier?: string;
        contract_end_date?: string | null;
        dma_end_date?: string | null;
        retailer?: string;
      }[] = [];
      for (const utilityType of types) {
        const ids = accountsRef.current
          .filter((account) => account.utilityType === utilityType)
          .map((account) => account.identifier);
        if (ids.length === 0) continue;
        try {
          const res = await fetch(
            `${getApiBaseUrl()}/api/utility-records?utility_type=${encodeURIComponent(utilityType)}&identifiers=${encodeURIComponent(ids.join(","))}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (!res.ok) continue;
          const payload = (await res.json()) as { records?: typeof rows };
          rows.push(...(payload.records ?? []));
        } catch {
          /* the sheet comparison still shows */
        }
      }
      if (cancelled || rows.length === 0) return;
      const next = accountsRef.current.map((account) => {
        const hit = rows.find((row) => {
          const stored = String(row.identifier || "").trim().toUpperCase();
          const query = String(row.query || "").trim().toUpperCase();
          const id = account.identifier.trim().toUpperCase();
          return stored === id || query === id;
        });
        if (!hit) return account;
        const contractEnd = toIsoDate(hit.contract_end_date);
        const dmaEnd = toIsoDate(hit.dma_end_date);
        const retailer = String(hit.retailer || "");
        const key = `${account.utilityType}:${account.identifier}`;
        const original = accountOriginalRef.current.find(
          (item) => item.utilityType === account.utilityType && item.identifier === account.identifier,
        );
        accountOriginalRef.current = accountOriginalRef.current.map((item) =>
          item.utilityType === account.utilityType && item.identifier === account.identifier
            ? {
                ...item,
                contractEnd: contractEnd || item.contractEnd,
                dmaEnd: dmaEnd || item.dmaEnd,
                retailer: retailer || item.retailer,
              }
            : item,
        );
        if (touchedRef.current.has(key)) return account;
        const formStillMatchesAirtable = account.contractEnd === (original?.contractEnd ?? "");
        return {
          ...account,
          retailer: retailer || account.retailer,
          contractEnd: contractEnd && (formStillMatchesAirtable || !account.contractEnd) ? contractEnd : account.contractEnd,
          dmaEnd: dmaEnd && (account.dmaEnd === (original?.dmaEnd ?? "") || !account.dmaEnd) ? dmaEnd : account.dmaEnd,
        };
      });
      accountsRef.current = next;
      setAccounts(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [accountIdentity, fuel, token]);

  useEffect(() => {
    if (!fuel) return;
    let changed = false;
    const next = accountsRef.current.map((account) => {
      const key = `${account.utilityType}:${account.identifier}`;
      if (touchedRef.current.has(key)) return account;
      const sheet = sheetByKey[key];
      if (!sheet || sheet.error || sheet.matchKind === "none" || !sheet.sheetEnd) return account;
      const original = accountOriginalRef.current.find(
        (item) => item.utilityType === account.utilityType && item.identifier === account.identifier,
      );
      if (!original) return account;
      if (account.retailerWritable && account.retailer !== original.retailer && account.retailer !== sheet.sheetRetailer) {
        return account;
      }
      const patch: Partial<LinkedAccount> = {};
      if (account.contractEnd !== sheet.sheetEnd) patch.contractEnd = sheet.sheetEnd;
      if (account.retailerWritable && !original.retailer.trim() && sheet.sheetRetailer) {
        patch.retailer = sheet.sheetRetailer;
      }
      if (Object.keys(patch).length === 0) return account;
      changed = true;
      return { ...account, ...patch };
    });
    if (!changed) return;
    accountsRef.current = next;
    setAccounts(next);
  }, [fuel, sheetByKey]);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!readyParams) {
      setLoading(false);
      return;
    }
    if (!token) {
      setLoading(false);
      setError("Sign in to edit this checklist.");
      return;
    }
    void load();
  }, [load, readyParams, sessionStatus, token]);

  const flush = useCallback(
    async (intent: SaveIntent) => {
      if (!token || !readyParams || !definition || conflictRef.current) return;
      if (inFlightRef.current) {
        queuedRef.current = intent;
        return;
      }
      inFlightRef.current = true;
      setSaving(true);
      setError(null);
      try {
        const body: Record<string, unknown> = {
          utility_type: fuel,
          identifier: FUEL_CHECKLIST_ID,
          status: intent.status,
          answers: intent.answers,
          template_version: definition.templateVersion,
        };
        if (rowVersionRef.current != null) {
          body.row_version = rowVersionRef.current;
        }
        const res = await fetch(`${getApiBaseUrl()}/api/clients/${clientId}/utility-checklists`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        if (res.status === 409) {
          if (timerRef.current != null) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
          }
          conflictRef.current = true;
          queuedRef.current = null;
          setConflict(true);
          return;
        }
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error((payload as { detail?: string }).detail || "Could not save the checklist");
        }
        const saved = (await res.json()) as UtilityChecklistRecord;
        rowVersionRef.current = saved.row_version;
        statusRef.current = saved.status;
        setStatus(saved.status);
        setUpdatedAt(saved.updated_at);
      } catch (err) {
        queuedRef.current = null;
        setError(err instanceof Error ? err.message : "Could not save the checklist");
      } finally {
        inFlightRef.current = false;
        const next = queuedRef.current;
        queuedRef.current = null;
        if (next && !conflictRef.current) {
          void flush(next);
        } else {
          setSaving(false);
        }
      }
    },
    [clientId, definition, fuel, readyParams, token],
  );

  const scheduleAutosave = useCallback(() => {
    if (!loadedRef.current || conflictRef.current) return;
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void flush({ status: statusRef.current, answers: answersRef.current });
    }, AUTOSAVE_MS);
  }, [flush]);

  useEffect(() => {
    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const saveNow = (nextStatus: ChecklistStatus) => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    statusRef.current = nextStatus;
    setStatus(nextStatus);
    void flush({ status: nextStatus, answers: answersRef.current });
  };

  const accountKey = (account: LinkedAccount) => `${account.utilityType}:${account.identifier}`;

  const pushAccount = useCallback(
    async (utilityType: string, identifier: string, fallbacks: string[] = []) => {
      if (!token) return;
      const current = accountsRef.current.find(
        (account) => account.utilityType === utilityType && account.identifier === identifier,
      );
      const original = accountOriginalRef.current.find(
        (account) => account.utilityType === utilityType && account.identifier === identifier,
      );
      if (!current || !original) return;
      const body: Record<string, unknown> = {
        business_name: businessName,
        utility_type: utilityType,
        identifier,
      };
      let changed = false;
      if (current.contractEnd !== original.contractEnd) {
        body.contract_end_date = current.contractEnd;
        changed = true;
      }
      if (current.dmaEnd !== original.dmaEnd) {
        body.dma_end_date = current.dmaEnd;
        changed = true;
      }
      if (current.retailerWritable && current.retailer !== original.retailer) {
        body.retailer = current.retailer;
        changed = true;
      }
      const key = accountKey(current);
      if (!changed) return;
      const targets = [identifier, ...fallbacks.filter((item) => item && item !== identifier)];
      setAccountNote((prev) => ({ ...prev, [key]: "Saving to Airtable…" }));
      try {
        let savedOn = "";
        let lastError = "Utility record not found or update failed. Check business name, utility type, and identifier.";
        for (const target of targets) {
          const res = await fetch(`${getApiBaseUrl()}/api/utility-record`, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ ...body, identifier: target }),
          });
          if (res.ok) {
            savedOn = target;
            break;
          }
          const payload = await res.json().catch(() => ({}));
          lastError = (payload as { detail?: string }).detail || lastError;
          if (res.status !== 404) break;
        }
        if (!savedOn) throw new Error(lastError);
        accountOriginalRef.current = accountOriginalRef.current.map((account) =>
          account.utilityType === utilityType && account.identifier === identifier ? { ...current } : account,
        );
        setAccountNote((prev) => ({
          ...prev,
          [key]: savedOn === identifier ? "Saved to Airtable" : `Saved to Airtable on ${savedOn}`,
        }));
      } catch (err) {
        setAccountNote((prev) => ({
          ...prev,
          [key]: err instanceof Error ? err.message : "Could not update the account in Airtable",
        }));
      }
    },
    [businessName, token],
  );

  const updateAccount = (utilityType: string, identifier: string, patch: Partial<LinkedAccount>) => {
    touchedRef.current.add(`${utilityType}:${identifier}`);
    setAccounts((prev) => {
      const next = prev.map((account) =>
        account.utilityType === utilityType && account.identifier === identifier ? { ...account, ...patch } : account,
      );
      accountsRef.current = next;
      return next;
    });
  };

  const setField = (key: string, value: unknown) => {
    setAnswers((prev) => {
      const next = { ...prev, [key]: value };
      answersRef.current = next;
      return next;
    });
    scheduleAutosave();
  };

  const title = fuel === "gas" ? "Gas checklist" : fuel === "electricity" ? "Electricity checklist" : "Utility checklist";
  const accountLabel = fuel === "gas" ? "MRIN" : "NMI";
  const locked = conflict || loading || !loadedRef.current;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        pageName={title}
        description={
          readyParams
            ? `${businessName} · every linked ${fuel === "gas" ? "gas" : "electricity"} account`
            : "Open this page from the member's utilities tab."
        }
      />

      {!readyParams && (
        <p className="text-sm text-red-600">This checklist link is missing a member or a business name.</p>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      )}

      {conflict && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <p>Someone else saved this checklist.</p>
          <Button type="button" size="sm" variant="secondary" onClick={() => void load()}>
            Reload
          </Button>
        </div>
      )}

      {readyParams && definition && (
        <div className="space-y-6 rounded-xl border border-stroke bg-white p-5 dark:border-dark-3 dark:bg-gray-dark">
          {loading && <p className="text-sm text-gray-500">Loading checklist…</p>}

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-dark dark:text-white">Linked accounts</h2>
            {accounts.length === 0 && !loading ? (
              <p className="text-sm text-gray-500">No {fuel === "gas" ? "gas" : "electricity"} accounts are linked to this member.</p>
            ) : (
              groupLinkedAccounts(accounts, fuel).map((group) => {
                const account = group.primary;
                const key = accountKey(account);
                const note = accountNote[key];
                const sheet = sheetByKey[key];
                const airtable = accountOriginalRef.current.find(
                  (item) => item.utilityType === account.utilityType && item.identifier === account.identifier,
                );
                const sheetLabel = sheet?.sheetEnd ? formatIsoDate(sheet.sheetEnd) : sheet?.sheetEndRaw || "";
                const airtableLabel = airtable?.contractEnd ? formatIsoDate(airtable.contractEnd) : "";
                const sheetFound = Boolean(sheet && !sheet.error && sheet.matchKind !== "none");
                const sheetDiffers = Boolean(sheetFound && sheet && sheet.sheetEnd !== (airtable?.contractEnd ?? ""));
                const retailerDiffers = Boolean(
                  sheetFound &&
                    sheet?.sheetRetailer &&
                    airtable?.retailer &&
                    !sameRetailer(sheet.sheetRetailer, airtable.retailer),
                );
                const sheetMissing = Boolean(sheet && !sheet.error && sheet.matchKind === "none");
                const pendingAirtable = Boolean(
                  airtable &&
                    (account.contractEnd !== airtable.contractEnd ||
                      account.dmaEnd !== airtable.dmaEnd ||
                      (account.retailerWritable && account.retailer !== airtable.retailer)),
                );
                const isCiSheet =
                  account.utilityType === "C&I Gas" || account.utilityType === "C&I Electricity";
                return (
                  <div key={key} className="space-y-3 rounded-lg border border-stroke p-3 dark:border-dark-3">
                    <p className="text-sm font-medium text-dark dark:text-white">
                      {account.utilityType} · {accountLabel} {account.identifier}
                    </p>
                    {group.others.map((other) => (
                      <p key={other.account.identifier} className="text-xs text-amber-800 dark:text-amber-200">
                        Airtable also has {accountLabel} {other.account.identifier}. That is the same{" "}
                        {accountLabel} with{" "}
                        {other.kind === "checksum"
                          ? other.account.identifier.length > account.identifier.length
                            ? "one extra digit"
                            : "one digit missing"
                          : "a different last digit"}
                        , so it is not a second site.
                        {other.account.contractEnd
                          ? ` Its Airtable contract end is ${formatIsoDate(other.account.contractEnd)}.`
                          : " It has no contract end in Airtable."}
                      </p>
                    ))}
                    {sheet?.error ? (
                      <p className="text-xs text-red-600">{sheet.error}</p>
                    ) : null}
                    {!isCiSheet ? (
                      <p className="text-xs text-gray-500">
                        Only C&amp;I accounts are on the signed contract sheet, so this cross-check uses Airtable only.
                      </p>
                    ) : null}
                    {sheet && !sheet.error && isCiSheet ? (
                      <div
                        className={`rounded-md px-3 py-2 text-xs ${
                          sheetDiffers || sheetMissing || retailerDiffers
                            ? "border border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
                            : "border border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/30 dark:text-green-100"
                        }`}
                      >
                        {sheetMissing ? (
                          <p>No matching row on the signed contract sheet ({sheet.tab || "signed C&I sheet"}).</p>
                        ) : sheetDiffers ? (
                          <p>
                            Contract end is filled from the signed sheet ({sheetLabel || "blank"}). Airtable still has{" "}
                            {airtableLabel || "no date"}.
                            {sheet.sheetRetailer ? ` Sheet retailer: ${sheet.sheetRetailer}.` : ""}
                            {retailerDiffers ? ` Airtable retailer is ${airtable?.retailer}.` : ""}
                            {sheet.matchKind === "checksum" || sheet.matchKind === "one_digit"
                              ? ` Matched sheet ${accountLabel} ${sheet.sheetIdentifier} (${sheet.matchKind === "checksum" ? "one trailing digit off" : "last digit differs"}).`
                              : ""}
                          </p>
                        ) : (
                          <p>
                            Signed contract sheet matches Airtable{sheetLabel ? ` (${sheetLabel})` : ""}.
                            {sheet.sheetRetailer ? ` Sheet retailer: ${sheet.sheetRetailer}.` : ""}
                            {retailerDiffers ? ` Airtable retailer is ${airtable?.retailer}.` : ""}
                          </p>
                        )}
                        {sheet.sheetUrl ? (
                          <div className="mt-2 flex flex-wrap gap-3">
                            <a
                              href={sheet.sheetUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium underline"
                            >
                              Open sheet
                            </a>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <label className="block space-y-1">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Retailer</span>
                        <input
                          className="w-full rounded-lg border border-stroke bg-white px-3 py-2 text-sm text-dark outline-none focus:border-primary disabled:opacity-60 dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                          type="text"
                          value={account.retailer}
                          disabled={locked || !account.retailerWritable}
                          onChange={(event) =>
                            updateAccount(account.utilityType, account.identifier, { retailer: event.target.value })
                          }
                        />
                        {!account.retailerWritable && (
                          <span className="text-xs text-gray-500">This retailer is a linked Airtable field.</span>
                        )}
                      </label>
                      <label className="block space-y-1">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Contract end</span>
                        <input
                          className="w-full rounded-lg border border-stroke bg-white px-3 py-2 text-sm text-dark outline-none focus:border-primary disabled:opacity-60 dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                          type="date"
                          value={account.contractEnd}
                          disabled={locked}
                          onChange={(event) =>
                            updateAccount(account.utilityType, account.identifier, { contractEnd: event.target.value })
                          }
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">DMA end</span>
                        <input
                          className="w-full rounded-lg border border-stroke bg-white px-3 py-2 text-sm text-dark outline-none focus:border-primary disabled:opacity-60 dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                          type="date"
                          value={account.dmaEnd}
                          disabled={locked}
                          onChange={(event) =>
                            updateAccount(account.utilityType, account.identifier, { dmaEnd: event.target.value })
                          }
                        />
                      </label>
                    </div>
                    {pendingAirtable ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        disabled={locked || note === "Saving to Airtable…"}
                        onClick={() =>
                          void pushAccount(
                            account.utilityType,
                            account.identifier,
                            group.others.map((other) => other.account.identifier),
                          )
                        }
                      >
                        Apply to Airtable
                      </Button>
                    ) : null}
                    {note ? <p className="text-xs text-gray-500 dark:text-gray-400">{note}</p> : null}
                  </div>
                );
              })
            )}
          </section>

          {definition.sections.map((section) => (
            <section key={section.title} className="space-y-3">
              <h2 className="text-sm font-semibold text-dark dark:text-white">{section.title}</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {section.fields.map((field) => (
                  <Field
                    key={field.key}
                    field={field}
                    value={fieldValue(answers, field.key)}
                    disabled={locked}
                    onChange={(value) => setField(field.key, value)}
                  />
                ))}
              </div>
            </section>
          ))}

          <div className="flex flex-wrap items-center gap-3 border-t border-stroke pt-4 dark:border-dark-3">
            {status === "complete" ? (
              <Button type="button" variant="secondary" disabled={locked || saving} onClick={() => saveNow("draft")}>
                Reopen
              </Button>
            ) : (
              <Button type="button" variant="primary" disabled={locked || saving} onClick={() => saveNow("complete")}>
                Mark complete
              </Button>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {saving ? "Saving…" : updatedAt ? `Last saved ${formatSaved(updatedAt)}` : "Edits save automatically"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  field,
  value,
  disabled,
  onChange,
}: {
  field: ChecklistField;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const inputClass =
    "w-full rounded-lg border border-stroke bg-white px-3 py-2 text-sm text-dark outline-none focus:border-primary disabled:opacity-60 dark:border-dark-3 dark:bg-dark-2 dark:text-white";

  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{field.label}</span>
      {field.type === "text" && (
        <input
          className={inputClass}
          type="text"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {field.type === "number" && (
        <input
          className={inputClass}
          type="number"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {field.type === "date" && (
        <input
          className={inputClass}
          type="date"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {(field.type === "yes_no" || field.type === "select") && (
        <select
          className={inputClass}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        >
          {field.type === "yes_no" ? (
            <>
              <option value="">Select</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </>
          ) : (
            (field.options ?? []).map((option) => (
              <option key={option.value || "empty"} value={option.value}>
                {option.label}
              </option>
            ))
          )}
        </select>
      )}
    </label>
  );
}

export default function UtilityChecklistPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-gray-500">Loading checklist…</p>}>
      <UtilityChecklistForm />
    </Suspense>
  );
}
