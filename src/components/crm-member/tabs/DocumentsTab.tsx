"use client";

import type React from "react";
import { useCallback, useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { FileLink } from "../shared/FileLink";
import { getApiBaseUrl } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

export interface DocumentsTabProps {
  businessInfo: Record<string, unknown> | null;
  setBusinessInfo: React.Dispatch<React.SetStateAction<Record<string, unknown> | null>>;
  businessName?: string | null;
}

interface SimpleDoc { fileName: string; id: string; }

const CONTRACT_KEYS = [
  "contract_C&I Electricity",
  "contract_SME Electricity",
  "contract_C&I Gas",
  "contract_SME Gas",
  "contract_Waste",
  "contract_Oil",
  "contract_DMA",
];

export function getDocumentsCountFromBusinessInfo(
  businessInfo: Record<string, unknown> | null
): number {
  if (!businessInfo) return 0;

  const processed =
    (businessInfo._processed_file_ids as Record<string, unknown>) ?? {};

  const docs: Record<string, any> =
    businessInfo &&
    typeof (businessInfo as any).business_documents === "object" &&
    (businessInfo as any).business_documents !== null &&
    !Array.isArray((businessInfo as any).business_documents)
      ? ((businessInfo as any).business_documents as Record<string, any>)
      : {};

  const getBusinessDocumentFileUrlForCount = (
    doc: string
  ): string | undefined => {
    const specialKeyMap: Record<string, string> = {
      "Floor Plan (Exit Map)": "business_site_map_upload",
    };
    const docKey = `business_${doc}`;
    const normalizedDocKey = `business_${doc
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")}`;
    const specialMappedKey = specialKeyMap[doc];

    const value =
      (processed[docKey] as string | undefined) ??
      (processed[normalizedDocKey] as string | undefined) ??
      (specialMappedKey
        ? (processed[specialMappedKey] as string | undefined)
        : undefined);

    return typeof value === "string" ? value : undefined;
  };

  const businessDocsCount = Object.keys(docs).filter((name) =>
    getBusinessDocumentFileUrlForCount(name)
  ).length;

  const loaUrl = processed["business_LOA"];
  const sfaRaw =
    processed["business_Service Fee Agreement"] ??
    processed["business_service_fee_agreement"] ??
    processed["business_SFA"] ??
    processed["Service Fee Agreement"] ??
    processed["service_fee_agreement"];
  const sfaUrl = typeof sfaRaw === "string" ? sfaRaw : undefined;
  const wipUrl = processed["business_WIP"];
  const amortExcelUrl = processed["business_amortisation_excel"];
  const amortPdfUrl = processed["business_amortisation_pdf"];

  return (
    businessDocsCount +
    (typeof loaUrl === "string" && loaUrl ? 1 : 0) +
    (typeof sfaUrl === "string" && sfaUrl ? 1 : 0) +
    (typeof wipUrl === "string" && wipUrl ? 1 : 0) +
    ((typeof amortExcelUrl === "string" && amortExcelUrl) ||
    (typeof amortPdfUrl === "string" && amortPdfUrl)
      ? 1
      : 0)
  );
}

// ─── Sub-tab definitions ──────────────────────────────────────────────────────

type DocTab = "contracts" | "businessDocs" | "eois" | "engagement" | "additional";

const DOC_TABS: { id: DocTab; label: string }[] = [
  { id: "contracts",    label: "Contracts & Signed Agreements" },
  { id: "businessDocs", label: "Business Documents" },
  { id: "eois",         label: "Signed EOIs" },
  { id: "engagement",   label: "Signed Engagement Forms" },
  { id: "additional",   label: "Additional Documents" },
];

// ─── Design primitives ────────────────────────────────────────────────────────

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200/80 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.06)] dark:shadow-none overflow-hidden">
      {children}
    </div>
  );
}

/** Inner sub-tab bar — matches the main tab bar visual language */
function SubTabBar({
  tabs,
  active,
  onChange,
  actions,
}: {
  tabs: { id: DocTab; label: string; count?: number }[];
  active: DocTab;
  onChange: (id: DocTab) => void;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 px-5 bg-gray-50/60 dark:bg-gray-800/20">
      <div className="flex items-center gap-0 -mb-px overflow-x-auto scrollbar-none">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`
              shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap
              ${active === t.id
                ? "border-gray-900 dark:border-white text-gray-900 dark:text-white"
                : "border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
              }
            `}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${active === t.id ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900" : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0 pl-3">{actions}</div>}
    </div>
  );
}

const ghostBtn =
  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium " +
  "text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 " +
  "border border-gray-200 dark:border-gray-700 " +
  "hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors " +
  "disabled:opacity-40 disabled:pointer-events-none";

const linkBtn =
  "text-xs font-medium text-gray-400 dark:text-gray-500 " +
  "hover:text-gray-600 dark:hover:text-gray-300 transition-colors " +
  "disabled:opacity-40 disabled:pointer-events-none";

/** Looks like a real button — used for "Open Contract", "Open EOI" etc. */
const openBtn =
  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium " +
  "text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 " +
  "transition-colors shrink-0";

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        </div>
        <div className="px-6 py-5 space-y-4">{children}</div>
      </div>
    </div>
  );
}

function MField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function MFooter({ onCancel, onSubmit, label, disabled, loading }: {
  onCancel: () => void; onSubmit?: () => void; label: string; disabled?: boolean; loading?: boolean;
}) {
  return (
    <div className="flex justify-end gap-2 pt-1">
      <button type="button" onClick={onCancel} className={ghostBtn}>Cancel</button>
      {onSubmit && (
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || loading}
          className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
        >
          {loading ? "Uploading…" : label}
        </button>
      )}
    </div>
  );
}

function FileDropInput({ accept, onChange, file }: { accept?: string; onChange: (f: File | null) => void; file: File | null }) {
  return (
    <div className="rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 px-3 py-2.5">
      <input
        type="file"
        accept={accept}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        className="block w-full text-xs text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-gray-100 dark:file:bg-gray-800 file:text-gray-700 dark:file:text-gray-200 hover:file:bg-gray-200 dark:hover:file:bg-gray-700 file:cursor-pointer file:transition-colors"
      />
      {file && <p className="mt-1 text-[11px] text-gray-400 truncate">{file.name}</p>}
    </div>
  );
}

function Alert({ msg, successStart }: { msg: string; successStart: string }) {
  if (!msg) return null;
  const ok = msg.startsWith(successStart);
  return (
    <p className={`text-xs rounded-lg px-3 py-2 ${ok ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"}`}>
      {msg}
    </p>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function DocumentsTab({ businessInfo, setBusinessInfo, businessName }: DocumentsTabProps) {
  const { data: session } = useSession();
  const token = (session as any)?.id_token ?? (session as any)?.accessToken;
  const info = businessInfo as any;
  const business = info?.business_details || {};
  const processed = info?._processed_file_ids || {};
  const docs: Record<string, any> =
    info && typeof info.business_documents === "object" && info.business_documents !== null && !Array.isArray(info.business_documents)
      ? (info.business_documents as Record<string, any>)
      : {};

  const [activeTab, setActiveTab] = useState<DocTab>("businessDocs");
  const [eoiRefreshing, setEoiRefreshing] = useState(false);
  const [additionalDocs, setAdditionalDocs] = useState<SimpleDoc[]>([]);
  const [engagementForms, setEngagementForms] = useState<SimpleDoc[]>([]);
  const [wipLoading, setWipLoading] = useState(false);

  const [showDriveModal, setShowDriveModal] = useState(false);
  const [driveFilingType, setDriveFilingType] = useState("");
  const [driveBizName, setDriveBizName] = useState("");
  const [driveContractKey, setDriveContractKey] = useState<string | null>(null);
  const [driveContractStatus, setDriveContractStatus] = useState("Signed via ACES");
  const [driveFile, setDriveFile] = useState<File | null>(null);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveResult, setDriveResult] = useState<string | null>(null);

  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [addDocFile, setAddDocFile] = useState<File | null>(null);
  const [addDocType, setAddDocType] = useState("");
  const [addDocLoading, setAddDocLoading] = useState(false);
  const [addDocResult, setAddDocResult] = useState("");

  const [showEOIModal, setShowEOIModal] = useState(false);
  const [eoiFile, setEoiFile] = useState<File | null>(null);
  const [eoiLoading, setEoiLoading] = useState(false);
  const [eoiResult, setEoiResult] = useState("");

  const efRef = useRef<HTMLInputElement>(null);
  const [efLoading, setEfLoading] = useState(false);
  const [efResult, setEfResult] = useState("");

  const { showToast } = useToast();
  const driveUrl = (info?.gdrive?.folder_url as string) || "";
  const driveFileUrl = (id: string) => `https://drive.google.com/file/d/${id}/view?usp=drivesdk`;
  const loaUrl = processed["business_LOA"] as string | undefined;
  const sfaRaw =
    processed["business_Service Fee Agreement"] ??
    processed["business_service_fee_agreement"] ??
    processed["business_SFA"] ??
    processed["Service Fee Agreement"] ??
    processed["service_fee_agreement"];
  const sfaUrl = typeof sfaRaw === "string" ? sfaRaw : undefined;
  const wipUrl = processed["business_WIP"] as string | undefined;
  const amortExcelUrl = processed["business_amortisation_excel"] as string | undefined;
  const amortPdfUrl = processed["business_amortisation_pdf"] as string | undefined;

  const getBusinessDocumentFileUrl = (doc: string): string | undefined => {
    const specialKeyMap: Record<string, string> = {
      "Floor Plan (Exit Map)": "business_site_map_upload",
    };
    const docKey = `business_${doc}`;
    const normalizedDocKey = `business_${doc.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
    const specialMappedKey = specialKeyMap[doc];

    const value =
      (processed[docKey] as string | undefined) ??
      (processed[normalizedDocKey] as string | undefined) ??
      (specialMappedKey ? (processed[specialMappedKey] as string | undefined) : undefined);

    return typeof value === "string" ? value : undefined;
  };

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchEOI = useCallback(async () => {
    if (!business?.name) return;
    setEoiRefreshing(true);
    try {
      const res = await fetch("https://membersaces.app.n8n.cloud/webhook/return_EOIIDs", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_name: business.name }),
      });
      const data = await res.json();
      if (Array.isArray(data) && data.length) {
        const mapped: Record<string, string> = {};
        data.forEach((row: any) => {
          const t = row["EOI Type"]; const id = row["EOI File ID"];
          if (t && id && /^[a-zA-Z0-9_-]{10,}$/.test(id))
            mapped[`eoi_${t.trim().replace(/\s+/g, "_")}`] = driveFileUrl(id);
        });
        if (Object.keys(mapped).length)
          setBusinessInfo((prev: any) => ({ ...prev, _processed_file_ids: { ...(prev?._processed_file_ids ?? {}), ...mapped } }));
      }
    } catch {} finally { setEoiRefreshing(false); }
  }, [business?.name, setBusinessInfo]);

  const fetchWIP = useCallback(async () => {
    if (!business?.name) return;
    setWipLoading(true);
    try {
      const res = await fetch("https://membersaces.app.n8n.cloud/webhook/pull_wip_both", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_name: business.name }),
      });
      if (!res.ok) { setAdditionalDocs([]); setEngagementForms([]); return; }
      const text = await res.text();
      if (!text?.trim()) { setAdditionalDocs([]); setEngagementForms([]); return; }
      let data: any;
      try { data = JSON.parse(text); } catch { setAdditionalDocs([]); setEngagementForms([]); return; }
      if (data?.body) data = data.body;
      if (Array.isArray(data) && data.length) data = data[0];
      if (Array.isArray(data?.additional_documents)) {
        setAdditionalDocs(
          data.additional_documents
            .filter((i: any) => i?.["File Name"] || i?.["file_name"])
            .map((i: any) => ({
              fileName: i["File Name"] || i["file_name"] || "Unknown",
              id: i["File ID"] || i["file_id"] || i.id || "",
            }))
            .filter((d: SimpleDoc) => d.id)
        );
      } else setAdditionalDocs([]);
      if (Array.isArray(data?.engagement_forms) && data.engagement_forms.length) {
        setEngagementForms(
          data.engagement_forms
            .map((f: any) => ({ fileName: f?.name || f?.fileName || "Unknown", id: f?.fileId || f?.file_id || f?.id || "" }))
            .filter((f: SimpleDoc) => f.id)
        );
      } else setEngagementForms([]);
    } catch { setAdditionalDocs([]); setEngagementForms([]); } finally { setWipLoading(false); }
  }, [business?.name]);

  useEffect(() => {
    if (business?.name && token) { fetchEOI(); fetchWIP(); }
  }, [business?.name, token, fetchEOI, fetchWIP]);

  // ── Contract helpers ───────────────────────────────────────────────────────

  const CONTRACT_TO_FILING: Record<string, string> = {
    "C&I Electricity": "signed_CI_E", "SME Electricity": "signed_SME_E",
    "C&I Gas": "signed_CI_G", "SME Gas": "signed_SME_G",
    Waste: "signed_WASTE", Oil: "signed_OIL", DMA: "signed_DMA",
  };

  const contracts = ["C&I Electricity","SME Electricity","C&I Gas","SME Gas","Waste","Oil","DMA"].map((key) => ({
    key,
    url: processed[`contract_${key}`] as string | undefined,
    status: processed[`contract_${key}_status`] as string | undefined,
  }));

  const sortedContracts = [...contracts].sort((a, b) => {
    const aHas = !!a.url;
    const bHas = !!b.url;
    if (aHas === bHas) return 0;
    return aHas ? -1 : 1;
  });

  const contractType = (k: string) =>
    ({ "C&I Electricity":"C&I Electricity","SME Electricity":"SME Electricity","C&I Gas":"C&I Gas","SME Gas":"SME Gas",Waste:"Waste",Oil:"Other",DMA:"DMA" }[k] ?? null);

  const utilityType = (k: string) =>
    ["C&I Electricity","SME Electricity","C&I Gas","SME Gas","Waste","DMA","Other"].includes(k) ? k : null;

  const getIdentifier = (k: string): { type: "nmi"|"mirn"|null; value: string } => {
    const linked = (info?.Linked_Details as any)?.linked_utilities ?? {};
    const raw = linked[k];
    if (["C&I Electricity","SME Electricity","DMA"].includes(k) && raw)
      return { type: "nmi", value: typeof raw === "string" ? raw.split(",")[0].trim() : String(raw[0]||"") };
    if (["C&I Gas","SME Gas"].includes(k) && raw)
      return { type: "mirn", value: typeof raw === "string" ? raw.split(",")[0].trim() : String(raw[0]||"") };
    return { type: null, value: "" };
  };

  // ── Upload handlers ────────────────────────────────────────────────────────

  const resetDrive = () => { setShowDriveModal(false); setDriveFile(null); setDriveResult(null); setDriveContractKey(null); };

  const uploadDrive = async () => {
    if (!driveFile || !token) { setDriveResult("Please select a file and ensure you are signed in."); return; }
    setDriveLoading(true); setDriveResult(null);
    try {
      const fd = new FormData();
      fd.append("business_name", driveBizName); fd.append("filing_type", driveFilingType);
      fd.append("gdrive_url", driveUrl);
      if (driveFilingType.startsWith("signed_")) fd.append("contract_status", driveContractStatus);
      fd.append("file", driveFile);
      const res = await fetch(`${getApiBaseUrl()}/api/drive-filing?token=${encodeURIComponent(token)}`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      const data = await res.json();
      if (data.status === "success") { setDriveResult("File successfully uploaded!"); showToast("File uploaded successfully.","success"); }
      else { setDriveResult(`Error: ${data.message||"Upload failed"}`); showToast(data.message||"Upload failed","error"); }
    } catch (e: any) { setDriveResult(`Error: ${e?.message}`); showToast(e?.message,"error"); }
    finally { setDriveLoading(false); }
  };

  const uploadAddDoc = async () => {
    if (!addDocFile || !business?.name) { setAddDocResult("No file selected."); return; }
    const fn = addDocFile.name.toLowerCase();
    if (![".pdf",".xlsx",".xls",".docx",".doc"].some((e) => fn.endsWith(e))) { setAddDocResult("Please upload a PDF, Excel, or Word file."); return; }
    if (!addDocType.trim()) { setAddDocResult("Please enter a document type."); return; }
    setAddDocLoading(true); setAddDocResult("");
    try {
      const ext = fn.slice(fn.lastIndexOf("."));
      const fd = new FormData();
      fd.append("file", addDocFile); fd.append("business_name", business.name);
      fd.append("gdrive_url", driveUrl); fd.append("timestamp", new Date().toISOString());
      fd.append("new_filename", `${business.name} - ${addDocType}${ext}`);
      const res = await fetch("https://membersaces.app.n8n.cloud/webhook/additional_document_upload", { method: "POST", body: fd });
      const text = await res.text();
      let d: any; try { d = JSON.parse(text); } catch { d = { message: text }; }
      if (res.ok) {
        setAddDocResult("Document uploaded successfully!"); showToast("Document uploaded successfully.","success");
        setTimeout(() => fetchWIP(), 1000);
        setTimeout(() => { setShowAddDocModal(false); setAddDocFile(null); setAddDocType(""); setAddDocResult(""); }, 2000);
      } else { setAddDocResult(`Error: ${d.message||"Failed"}`); showToast(d.message||"Upload failed","error"); }
    } catch (e: any) { setAddDocResult(`Error: ${e?.message}`); showToast(e?.message,"error"); }
    finally { setAddDocLoading(false); }
  };

  const uploadEOI = async () => {
    if (!eoiFile) { setEoiResult("No file selected."); return; }
    if (!eoiFile.name.toLowerCase().endsWith(".pdf")) { setEoiResult("Please upload a PDF file."); return; }
    setEoiLoading(true); setEoiResult("");
    try {
      const fd = new FormData(); fd.append("file", eoiFile);
      const res = await fetch("https://aces-invoice-api-672026052958.australia-southeast2.run.app/v1/eoi/process-eoi", { method: "POST", body: fd });
      const d = await res.json().catch(() => ({ message: res.statusText }));
      if (res.ok) { setEoiResult("EOI successfully processed and uploaded!"); showToast("EOI uploaded successfully.","success"); setTimeout(() => fetchEOI(), 1500); }
      else { setEoiResult(`Upload failed: ${d.message||res.statusText}`); showToast(d.message||"EOI upload failed","error"); }
    } catch (e: any) { setEoiResult(`Error: ${e?.message}`); showToast(e?.message,"error"); }
    finally { setEoiLoading(false); }
  };

  const uploadEF = async (file: File) => {
    if (!file || !business?.name) return;
    setEfLoading(true); setEfResult("");
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("linked_business_name", business.name);
      const res = await fetch("https://aces-invoice-api-672026052958.australia-southeast2.run.app/v1/ef/process-ef", { method: "POST", body: fd });
      const d = await res.json().catch(() => ({ message: res.statusText }));
      if (res.ok) { setEfResult("Engagement form uploaded successfully!"); showToast("Engagement form uploaded.","success"); setTimeout(() => fetchWIP(), 1000); }
      else { setEfResult(`Error: ${d.message||res.statusText}`); showToast(d.message||"Upload failed","error"); }
    } catch (e: any) { setEfResult(`Error: ${e?.message}`); showToast(e?.message,"error"); }
    finally { setEfLoading(false); }
  };

  // ── Derived collections / counts ────────────────────────────────────────────

  const eoiEntries = Object.entries(processed).filter(([k]) =>
    k.startsWith("eoi_")
  );

  const contractCount = contracts.filter((c) => c.url).length;

  const businessDocsCount =
    Object.keys(docs).filter((name) => !!getBusinessDocumentFileUrl(name))
      .length +
    (wipUrl ? 1 : 0) +
    (amortExcelUrl || amortPdfUrl ? 1 : 0) +
    (loaUrl ? 1 : 0) +
    (sfaUrl ? 1 : 0);

  const tabsWithCounts = DOC_TABS.map((t) => ({
    ...t,
    count:
      t.id === "contracts"
        ? contractCount
        : t.id === "businessDocs"
          ? businessDocsCount
          : t.id === "eois"
            ? eoiEntries.length
            : t.id === "engagement"
              ? engagementForms.length
              : t.id === "additional"
                ? additionalDocs.length
                : undefined,
  }));

  // ── Tab-level actions ───────────────────────────────────────────────────────

  const tabActions: Record<DocTab, React.ReactNode> = {
    contracts: null,
    businessDocs: null,
    eois: (
      <>
        <button
          type="button"
          onClick={fetchEOI}
          disabled={eoiRefreshing}
          className={linkBtn}
        >
          {eoiRefreshing ? "Refreshing…" : "Refresh"}
        </button>
        <button
          type="button"
          onClick={() => setShowEOIModal(true)}
          className={ghostBtn}
        >
          Upload EOI
        </button>
      </>
    ),
    engagement: (
      <>
        <input
          ref={efRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadEF(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => efRef.current?.click()}
          disabled={efLoading}
          className={ghostBtn}
        >
          {efLoading ? "Uploading…" : "Upload Form"}
        </button>
      </>
    ),
    additional: (
      <>
        <button
          type="button"
          onClick={fetchWIP}
          disabled={wipLoading}
          className={linkBtn}
        >
          {wipLoading ? "Refreshing…" : "Refresh"}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowAddDocModal(true);
            setAddDocFile(null);
            setAddDocType("");
            setAddDocResult("");
          }}
          className={ghostBtn}
        >
          Upload Document
        </button>
      </>
    ),
  };

  // ── Not loaded state ───────────────────────────────────────────────────────

  if (!businessInfo) {
    return (
      <Panel>
        <div className="px-5 py-12 text-center">
          <p className="text-sm text-gray-400">No business information loaded yet.</p>
          <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Load the member&apos;s business details to see documents.</p>
        </div>
      </Panel>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Panel>
        {/* Sub-tab bar */}
        <SubTabBar
          tabs={tabsWithCounts}
          active={activeTab}
          onChange={setActiveTab}
          actions={tabActions[activeTab]}
        />

        {/* ── Business Documents ── */}
        {activeTab === "businessDocs" && (
          <div className="px-5 py-5">
            {Object.keys(docs).length === 0 &&
            !wipUrl &&
            !amortExcelUrl &&
            !amortPdfUrl &&
            !loaUrl &&
            !sfaUrl ? (
              <p className="text-sm text-gray-400">
                No business documents available.
              </p>
            ) : (
              <div className="space-y-2">
                {[
                  "LOA",
                  "Service Fee Agreement",
                  ...Object.keys(docs),
                  "Work in Progress (WIP)",
                  "Amortisation / Asset List",
                ]
                  .filter((doc, index, arr) => arr.indexOf(doc) === index)
                  .sort((docA, docB) => {
                    const order = (doc: string) => {
                      if (doc === "LOA") return 0;
                      if (doc === "Service Fee Agreement") return 1;
                      if (doc === "Work in Progress (WIP)") return 2;
                      if (doc === "Amortisation / Asset List") return 3;
                      return 4;
                    };
                    const oa = order(docA);
                    const ob = order(docB);
                    if (oa !== ob) return oa - ob;

                    const isWipA = docA === "Work in Progress (WIP)";
                    const isWipB = docB === "Work in Progress (WIP)";
                    const isAmortA = docA === "Amortisation / Asset List";
                    const isAmortB = docB === "Amortisation / Asset List";

                    const fileUrlA =
                      docA === "LOA"
                        ? loaUrl
                        : docA === "Service Fee Agreement"
                          ? sfaUrl
                          : isWipA
                            ? wipUrl
                            : isAmortA
                              ? amortExcelUrl || amortPdfUrl
                              : getBusinessDocumentFileUrl(docA);
                    const fileUrlB =
                      docB === "LOA"
                        ? loaUrl
                        : docB === "Service Fee Agreement"
                          ? sfaUrl
                          : isWipB
                            ? wipUrl
                            : isAmortB
                              ? amortExcelUrl || amortPdfUrl
                              : getBusinessDocumentFileUrl(docB);

                    if (fileUrlA && !fileUrlB) return -1;
                    if (!fileUrlA && fileUrlB) return 1;
                    return 0;
                  })
                  .map((doc) => {
                    const isLoa = doc === "LOA";
                    const isSfa = doc === "Service Fee Agreement";
                    const isWip = doc === "Work in Progress (WIP)";
                    const isAmort = doc === "Amortisation / Asset List";
                    const fileUrl = isLoa
                      ? loaUrl
                      : isSfa
                        ? sfaUrl
                        : isWip
                          ? wipUrl
                          : isAmort
                            ? amortExcelUrl || amortPdfUrl
                            : getBusinessDocumentFileUrl(doc);

                    return (
                      <div
                        key={doc}
                        className={`flex items-center justify-between px-4 py-2 rounded border transition-colors ${
                          fileUrl
                            ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800"
                            : "bg-gray-50 border-gray-200 dark:bg-gray-900/40 dark:border-gray-700"
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                            {doc}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {isAmort ? (
                              <>
                                {amortExcelUrl && (
                                  <>
                                    <FileLink
                                      label="Excel"
                                      url={amortExcelUrl}
                                    />
                                    {amortPdfUrl && " | "}
                                  </>
                                )}
                                {amortPdfUrl && (
                                  <FileLink label="PDF" url={amortPdfUrl} />
                                )}
                                {!amortExcelUrl &&
                                  !amortPdfUrl &&
                                  "Not available"}
                              </>
                            ) : fileUrl ? (
                              <FileLink
                                label={isLoa || isSfa ? "Open file" : "View File"}
                                url={fileUrl}
                              />
                            ) : (
                              "Not available"
                            )}
                          </div>
                        </div>
                        {!isWip && !isAmort && (
                          <button
                            type="button"
                            onClick={() => {
                              let filingType = doc
                                .toLowerCase()
                                .replace(/[^a-z0-9]+/g, "_");
                              if (filingType === "site_profling")
                                filingType = "site_profiling";
                              if (filingType === "service_fee_agreement")
                                filingType = "savings";
                              if (
                                filingType.includes("exit_map") ||
                                filingType.includes("exitmap") ||
                                filingType.includes("floor_plan_exit_map")
                              ) {
                                filingType = "site_map_upload";
                              }
                              setDriveFilingType(filingType);
                              setDriveBizName(business?.name || "");
                              setDriveContractKey(null);
                              setDriveResult(null);
                              setDriveFile(null);
                              setShowDriveModal(true);
                            }}
                            className={ghostBtn}
                          >
                            File
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ── Contracts & Signed Agreements ── */}
        {activeTab === "contracts" && (
          <div className="divide-y divide-gray-50 dark:divide-gray-800/40">
            {sortedContracts.map((c) => (
              <div
                key={c.key}
                className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      c.url ? "bg-emerald-400" : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  />
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {c.key}
                  </span>
                  <span className="text-[11px] text-gray-400 truncate">
                    {c.status || (c.url ? "" : "Not available")}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {c.url ? (
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={openBtn}
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                      Open Contract
                    </a>
                  ) : (
                    <span className="text-[11px] text-gray-300 dark:text-gray-700 px-2">
                      No file
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setDriveFilingType(
                        CONTRACT_TO_FILING[c.key] ??
                          c.key.toLowerCase().replace(/[^a-z0-9]+/g, "_")
                      );
                      setDriveBizName(business?.name || "");
                      setDriveContractKey(c.key);
                      setDriveResult(null);
                      setDriveFile(null);
                      setShowDriveModal(true);
                    }}
                    className={ghostBtn}
                  >
                    File
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Signed EOIs ── */}
        {activeTab === "eois" && (
          <div className="px-5 py-5">
            {eoiEntries.length === 0 ? (
              <p className="text-sm text-gray-400">
                No EOIs have been processed yet.
              </p>
            ) : (
              <ul className="divide-y divide-gray-50 dark:divide-gray-800/40">
                {eoiEntries.map(([key, url]) => (
                  <li
                    key={key}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {key.replace(/^eoi_/, "").replace(/_/g, " ")}
                    </span>
                    <a
                      href={String(url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={openBtn}
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                      Open EOI
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── Signed Engagement Forms ── */}
        {activeTab === "engagement" && (
          <div className="px-5 py-5 space-y-4">
            {efResult && (
              <Alert
                msg={efResult}
                successStart="Engagement form uploaded"
              />
            )}
            {engagementForms.length === 0 ? (
              <p className="text-sm text-gray-400">No engagement forms found.</p>
            ) : (
              <ul className="divide-y divide-gray-50 dark:divide-gray-800/40">
                {engagementForms.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {f.fileName}
                    </span>
                    <a
                      href={driveFileUrl(f.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={openBtn}
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                      Open Form
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── Additional Documents ── */}
        {activeTab === "additional" && (
          <div className="px-5 py-5">
            {additionalDocs.length === 0 ? (
              <p className="text-sm text-gray-400">
                No additional documents found.
              </p>
            ) : (
              <ul className="divide-y divide-gray-50 dark:divide-gray-800/40">
                {additionalDocs.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {doc.fileName}
                    </span>
                    <a
                      href={driveFileUrl(doc.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={openBtn}
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                      Open
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Panel>

      {/* ── Drive filing modal ── */}
      <Modal open={showDriveModal} onClose={() => !driveLoading && resetDrive()} title="File in Drive">
        <MField label="Business">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{driveBizName}</p>
        </MField>
        <MField label="Filing Type">
          <p className="text-sm text-gray-500 font-mono">{driveFilingType}</p>
        </MField>
        {driveFilingType.startsWith("signed_") && (
          <MField label="Contract Status">
            <div className="flex gap-5 mt-0.5">
              {["Signed via ACES","Existing Contract"].map((v) => (
                <label key={v} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                  <input type="radio" name="driveStatus" checked={driveContractStatus === v} onChange={() => setDriveContractStatus(v)} className="accent-gray-900 dark:accent-white" />
                  {v === "Existing Contract" ? "Existing Contract (Copy)" : v}
                </label>
              ))}
            </div>
          </MField>
        )}
        <MField label="File">
          <FileDropInput onChange={setDriveFile} file={driveFile} />
        </MField>
        {driveResult && <Alert msg={driveResult} successStart="File successfully" />}
        {driveResult?.includes("success") && driveFilingType.startsWith("signed_") && driveContractKey && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-3">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">Lodge this agreement with the retailer?</p>
            <a
              href={(() => {
                const p = new URLSearchParams();
                p.set("businessName", driveBizName); p.set("hasFile", "true");
                const ut = utilityType(driveContractKey); const ct = contractType(driveContractKey);
                const id = getIdentifier(driveContractKey);
                if (ut) p.set("utilityType", ut); if (ct) p.set("contractType", ct);
                if (id.type && id.value) p.set(id.type, id.value);
                return `/signed-agreement-lodgement?${p.toString()}`;
              })()}
              target="_blank" rel="noopener noreferrer"
              className="text-xs font-semibold text-blue-700 dark:text-blue-300 hover:underline"
            >
              Lodge Agreement with Retailer →
            </a>
          </div>
        )}
        <MFooter onCancel={resetDrive} onSubmit={uploadDrive} label="Upload" disabled={!driveFile} loading={driveLoading} />
      </Modal>

      {/* ── Additional doc modal ── */}
      <Modal open={showAddDocModal} onClose={() => !addDocLoading && setShowAddDocModal(false)} title="Upload Document">
        <MField label="Document Type">
          <input
            type="text" value={addDocType} onChange={(e) => setAddDocType(e.target.value)}
            placeholder="For example: Invoice, Report, Compliance doc"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700"
          />
        </MField>
        <MField label="File — PDF, Excel, or Word">
          <FileDropInput accept=".pdf,.xlsx,.xls,.docx,.doc" onChange={setAddDocFile} file={addDocFile} />
        </MField>
        {addDocResult && <Alert msg={addDocResult} successStart="Document uploaded" />}
        <MFooter onCancel={() => setShowAddDocModal(false)} onSubmit={uploadAddDoc} label="Upload" disabled={!addDocFile || !addDocType.trim()} loading={addDocLoading} />
      </Modal>

      {/* ── EOI modal ── */}
      <Modal open={showEOIModal} onClose={() => !eoiLoading && setShowEOIModal(false)} title="Upload EOI">
        <MField label="PDF File">
          <FileDropInput accept=".pdf" onChange={setEoiFile} file={eoiFile} />
        </MField>
        {eoiResult && <Alert msg={eoiResult} successStart="EOI successfully" />}
        <MFooter onCancel={() => setShowEOIModal(false)} onSubmit={uploadEOI} label="Upload" disabled={!eoiFile} loading={eoiLoading} />
      </Modal>
    </>
  );
}