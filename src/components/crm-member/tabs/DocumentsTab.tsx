"use client";

import type React from "react";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { FileLink } from "../shared/FileLink";
import { cn, getApiBaseUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ButtonProps } from "@/components/ui/button";
import { formatBackendErrorBody } from "@/lib/api-errors";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import {
  fetchSitePhotos,
  uploadSitePhotos,
  type SitePhoto,
} from "@/lib/site-photos-api";
import { SitePhotosGallery } from "./SitePhotosGallery";
import { BRAND, CONTRACT_STATUS_OPTIONS } from "@/lib/brand";
import { RecordRow, RecordRowOpenAction } from "../shared/RecordRow";
import { getRecordRowIcon } from "../shared/recordRowIcons";
import { combineFilesIntoPdf } from "@/lib/combineFiles";
import { ShareFolderModal, SharedFolderStatusCard } from "@/components/ShareFolderModal";
import { defaultShareEmail } from "@/lib/share-folder-api";
import {
  collectMemberDocumentFileIds,
  fetchMemberEoiIds,
  fetchMemberWip,
  formatDocumentUploadDate,
  mapEoiRowsToFileIds,
  parseAdditionalDocuments,
  parseEngagementForms,
  uploadDateForRef,
  type MemberSimpleDoc,
} from "@/lib/member-documents-api";
import { useDocumentUploadDates } from "@/lib/use-document-upload-dates";
import {
  getBusinessDocumentFileUrl,
  getBusinessDocumentsForOverview,
  getContractsFromProcessed,
  displayDocName,
  getDocumentsCountFromBusinessInfo,
  getKeyDocumentsFromProcessed,
  KEY_DOC_LABELS,
  withUpdatedContractStatus,
} from "./documentHelpers";

export interface DocumentsTabProps {
  businessInfo: Record<string, unknown> | null;
  setBusinessInfo: React.Dispatch<React.SetStateAction<Record<string, unknown> | null>>;
  businessName?: string | null;
  /** When set, successful uploads are logged to the CRM activity report. */
  clientId?: number | null;
  onMemberUploadLogged?: () => void;
}

/** Best-effort link from n8n / invoice API JSON for activity report. */
function pickDocumentLinkFromUploadResponse(d: unknown): string | undefined {
  if (!d || typeof d !== "object") return undefined;
  const o = d as Record<string, unknown>;
  const keys = [
    "webViewLink",
    "web_view_link",
    "file_url",
    "fileUrl",
    "url",
    "link",
    "document_url",
    "view_link",
  ];
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && (v.startsWith("http://") || v.startsWith("https://"))) {
      return v;
    }
  }
  const id = o.file_id ?? o.fileId ?? o.File_ID ?? o["File ID"] ?? o.id;
  if (typeof id === "string" && /^[\w-]{10,}$/.test(id)) {
    return `https://drive.google.com/file/d/${id}/view?usp=drivesdk`;
  }
  return undefined;
}

function uploadedLabel(date?: string) {
  const formatted = formatDocumentUploadDate(date);
  return formatted ? `Uploaded ${formatted}` : undefined;
}

export { getDocumentsCountFromBusinessInfo } from "./documentHelpers";

// ─── Sub-tab definitions ──────────────────────────────────────────────────────

type DocTab = "contracts" | "businessDocs" | "eois" | "engagement" | "additional" | "sitePhotos";
type DocFilter = DocTab | "all";
type UploadCategory = "eoi" | "engagement" | "additional" | "sitePhotos";

const SITE_PHOTO_BATCH = 10;
const SITE_PHOTO_ACCEPT =
  ".jpg,.jpeg,.png,.webp,.gif,.heic,.heif,image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif";

const FILTER_CHIPS: { id: DocFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "contracts", label: "Contracts" },
  { id: "businessDocs", label: "Business" },
  { id: "eois", label: "EOIs" },
  { id: "engagement", label: "Engagement" },
  { id: "additional", label: "Additional" },
  { id: "sitePhotos", label: "Site Photos" },
];

const CATEGORY_SECTION_LABELS: Record<DocTab, string> = {
  contracts: "Contracts & Signed Agreements",
  businessDocs: "Business Documents",
  eois: "Signed EOIs",
  engagement: "Signed Engagement Forms",
  additional: "Additional Documents",
  sitePhotos: "Site Photos",
};

// ─── Design primitives ────────────────────────────────────────────────────────

function Panel({ children }: { children: React.ReactNode }) {
  return <Card className="overflow-hidden p-0">{children}</Card>;
}

function DocSecondaryBtn({ className, ...props }: ButtonProps) {
  return <Button variant="secondary" size="sm" radius="md" className={className} {...props} />;
}

function DocOpenBtn({ className, ...props }: ButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      radius="md"
      className={cn(
        "record-row-open shrink-0 border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10",
        className
      )}
      {...props}
    />
  );
}

function contractStatusBadge(status: string | undefined, hasUrl: boolean) {
  const s = (status ?? "").toLowerCase();
  if (!hasUrl && !status) {
    return (
      <Badge intent="neutral" shape="pill">
        Not available
      </Badge>
    );
  }
  if (status === BRAND.signedContractStatusValue || s.includes("signed via aces")) {
    return (
      <Badge intent="success" shape="pill">
        {status || BRAND.signedContractStatusLabel}
      </Badge>
    );
  }
  if (
    status === BRAND.signedExternallyStatusValue ||
    s.includes("signed externally")
  ) {
    return (
      <Badge intent="info" shape="pill">
        {BRAND.signedExternallyStatusLabel}
      </Badge>
    );
  }
  if (s.includes("existing")) {
    return (
      <Badge intent="neutral" shape="pill">
        {status}
      </Badge>
    );
  }
  if (status) {
    return (
      <Badge intent="info" shape="pill">
        {status}
      </Badge>
    );
  }
  return hasUrl ? (
    <Badge intent="success" shape="pill">
      Available
    </Badge>
  ) : (
    <Badge intent="neutral" shape="pill">
      Not available
    </Badge>
  );
}

function DocLinkBtn({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "text-xs font-medium text-primary hover:underline disabled:pointer-events-none disabled:opacity-40",
        className
      )}
      {...props}
    />
  );
}

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
      <DocSecondaryBtn onClick={onCancel}>Cancel</DocSecondaryBtn>
      {onSubmit && (
        <Button
          type="button"
          variant="primary"
          size="sm"
          radius="md"
          onClick={onSubmit}
          disabled={disabled || loading}
          loading={loading}
        >
          {loading ? "Uploading…" : label}
        </Button>
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

export function DocumentsTab({
  businessInfo,
  setBusinessInfo,
  businessName,
  clientId = null,
  onMemberUploadLogged,
}: DocumentsTabProps) {
  const { data: session } = useSession();
  const token = (session as any)?.id_token ?? (session as any)?.accessToken;
  const info = businessInfo as any;
  const business = info?.business_details || {};
  const contact = info?.contact_information || {};
  const rep = info?.representative_details || {};
  const linked = info?.Linked_Details?.linked_utilities || {};
  const retailers = info?.Linked_Details?.utility_retailers || {};
  const processed = info?._processed_file_ids || {};
  const docs: Record<string, any> =
    info && typeof info.business_documents === "object" && info.business_documents !== null && !Array.isArray(info.business_documents)
      ? (info.business_documents as Record<string, any>)
      : {};

  const [docFilter, setDocFilter] = useState<DocFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadCategory, setUploadCategory] = useState<UploadCategory>("additional");
  const [eoiRefreshing, setEoiRefreshing] = useState(false);
  const [additionalDocs, setAdditionalDocs] = useState<MemberSimpleDoc[]>([]);
  const [engagementForms, setEngagementForms] = useState<MemberSimpleDoc[]>([]);
  const [wipLoading, setWipLoading] = useState(false);
  const [sitePhotos, setSitePhotos] = useState<SitePhoto[]>([]);
  const [sitePhotosFolderUrl, setSitePhotosFolderUrl] = useState<string | null>(null);
  const [sitePhotosLoading, setSitePhotosLoading] = useState(false);
  const [showSitePhotosModal, setShowSitePhotosModal] = useState(false);
  const [sitePhotoFiles, setSitePhotoFiles] = useState<File[]>([]);
  const [sitePhotoLoading, setSitePhotoLoading] = useState(false);
  const [sitePhotoProgress, setSitePhotoProgress] = useState("");
  const [sitePhotoResult, setSitePhotoResult] = useState("");
  const documentFileIds = useMemo(
    () =>
      collectMemberDocumentFileIds(processed, [
        ...additionalDocs.map((d) => d.id),
        ...engagementForms.map((f) => f.id),
      ]),
    [processed, additionalDocs, engagementForms],
  );
  const driveUploadDates = useDocumentUploadDates(documentFileIds, token);
  const dateFor = (urlOrId?: string, fallback?: string) =>
    uploadDateForRef(urlOrId, driveUploadDates) || fallback;

  const [showDriveModal, setShowDriveModal] = useState(false);
  const [driveFilingType, setDriveFilingType] = useState("");
  const [driveBizName, setDriveBizName] = useState("");
  const [driveContractKey, setDriveContractKey] = useState<string | null>(null);
  const [driveContractStatus, setDriveContractStatus] = useState<string>(BRAND.signedContractStatusValue);
  const [driveContractUpdateMode, setDriveContractUpdateMode] = useState<
    "replace" | "append" | "append_multiple"
  >("replace");
  const [driveBatchFiles, setDriveBatchFiles] = useState<File[]>([]);
  const [driveFile, setDriveFile] = useState<File | null>(null);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveResult, setDriveResult] = useState<string | null>(null);
  const [statusSavingKey, setStatusSavingKey] = useState<string | null>(null);

  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [addDocFiles, setAddDocFiles] = useState<File[]>([]);
  const [addDocType, setAddDocType] = useState("");
  const [addDocLoading, setAddDocLoading] = useState(false);
  const [addDocResult, setAddDocResult] = useState("");

  const [showEOIModal, setShowEOIModal] = useState(false);
  const [eoiFile, setEoiFile] = useState<File | null>(null);
  const [eoiLoading, setEoiLoading] = useState(false);
  const [eoiResult, setEoiResult] = useState("");
  const [shareFolderOpen, setShareFolderOpen] = useState(false);
  const [shareRefresh, setShareRefresh] = useState(0);

  const efRef = useRef<HTMLInputElement>(null);
  const [efLoading, setEfLoading] = useState(false);
  const [efResult, setEfResult] = useState("");

  const { showToast } = useToast();
  const driveUrl = (info?.gdrive?.folder_url as string) || "";

  /** Same as BusinessInfoDisplay: open interactive site profiling with pre-filled context. */
  const openSiteProfiling = useCallback(() => {
    const params = new URLSearchParams();
    if (business?.name) params.set("businessName", String(business.name));
    const businessInfoToPass = {
      name: business.name,
      address: contact.postal_address,
      siteAddress: contact.site_address,
      industry: business.industry,
      website: business.website,
      phone: contact.telephone,
      email: contact.email,
      googleDriveLink: driveUrl,
      utilities: linked,
      retailers,
      abn: business.abn,
      tradingName: business.trading_name,
      contactName: rep.contact_name,
      position: rep.position,
    };
    params.set("businessInfo", encodeURIComponent(JSON.stringify(businessInfoToPass)));
    window.open(`/site-profiling?${params.toString()}`, "_blank", "noopener,noreferrer");
  }, [
    business?.name,
    business?.industry,
    business?.website,
    business?.abn,
    business?.trading_name,
    contact.postal_address,
    contact.site_address,
    contact.telephone,
    contact.email,
    driveUrl,
    linked,
    retailers,
    rep.contact_name,
    rep.position,
  ]);
  const driveFileUrl = (id: string) => `https://drive.google.com/file/d/${id}/view?usp=drivesdk`;
  const { loaUrl, sfaUrl, wipUrl, amortExcelUrl, amortPdfUrl } = getKeyDocumentsFromProcessed(processed);

  const logMemberUpload = useCallback(
    async (payload: {
      upload_kind: string;
      filename?: string | null;
      document_link?: string | null;
      filing_type?: string | null;
      utility_key?: string | null;
      metadata?: Record<string, unknown>;
    }) => {
      if (clientId == null || !token) return;
      try {
        const res = await fetch(
          `${getApiBaseUrl()}/api/clients/${clientId}/member-upload-activity`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              upload_kind: payload.upload_kind,
              filename: payload.filename ?? undefined,
              document_link: payload.document_link?.trim() || undefined,
              filing_type: payload.filing_type?.trim() || undefined,
              utility_key: payload.utility_key?.trim() || undefined,
              metadata: payload.metadata,
            }),
          },
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.warn("[member-upload-activity]", res.status, err);
          return;
        }
        onMemberUploadLogged?.();
      } catch (e) {
        console.warn("[member-upload-activity]", e);
      }
    },
    [clientId, token, onMemberUploadLogged],
  );

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchEOI = useCallback(async () => {
    if (!business?.name || !token) return;
    setEoiRefreshing(true);
    try {
      const data = await fetchMemberEoiIds(business.name, token);
      const mapped = mapEoiRowsToFileIds(data);
      if (Object.keys(mapped).length) {
        setBusinessInfo((prev: any) => ({
          ...prev,
          _processed_file_ids: { ...(prev?._processed_file_ids ?? {}), ...mapped },
        }));
      }
    } catch {
      /* ignore */
    } finally {
      setEoiRefreshing(false);
    }
  }, [business?.name, setBusinessInfo, token]);

  const fetchWIP = useCallback(async () => {
    if (!business?.name || !token) return;
    setWipLoading(true);
    try {
      const data = await fetchMemberWip(business.name, token);
      setAdditionalDocs(parseAdditionalDocuments(data));
      setEngagementForms(parseEngagementForms(data));
    } catch {
      setAdditionalDocs([]);
      setEngagementForms([]);
    } finally {
      setWipLoading(false);
    }
  }, [business?.name, token]);

  const fetchSitePhotosList = useCallback(async () => {
    if (!token) return;
    if (!driveUrl) {
      setSitePhotos([]);
      setSitePhotosFolderUrl(null);
      return;
    }
    setSitePhotosLoading(true);
    try {
      const data = await fetchSitePhotos(business?.name || "", driveUrl, token);
      setSitePhotos(data.files);
      setSitePhotosFolderUrl(data.folder_url ?? null);
    } catch {
      setSitePhotos([]);
      setSitePhotosFolderUrl(null);
    } finally {
      setSitePhotosLoading(false);
    }
  }, [business?.name, driveUrl, token]);

  useEffect(() => {
    if (business?.name && token) {
      fetchEOI();
      fetchWIP();
    }
  }, [business?.name, token, fetchEOI, fetchWIP]);

  useEffect(() => {
    if (token) void fetchSitePhotosList();
  }, [token, fetchSitePhotosList]);

  // ── Contract helpers ───────────────────────────────────────────────────────

  const CI_CONTRACT_API = {
    "C&I Electricity": "https://aces-invoice-api-672026052958.australia-southeast2.run.app/v1/ci-electricity-contract/process-contract",
    "C&I Gas": "https://aces-invoice-api-672026052958.australia-southeast2.run.app/v1/ci-gas-contract/process-contract",
  } as const;

  /** Fire-and-forget: send file to C&I contract API for discrepancy automation. */
  const silentProcessContract = (file: File, key: "C&I Electricity" | "C&I Gas") => {
    const url = CI_CONTRACT_API[key];
    if (!url || !file.name.toLowerCase().endsWith(".pdf")) {
      console.log("[C&I Contract API] Skipped:", key, !url ? "no URL" : "not a PDF", "file:", file.name);
      return;
    }
    console.log("[C&I Contract API] Calling", key, "file:", file.name, "url:", url);
    const fd = new FormData();
    fd.append("file", file);
    fetch(url, { method: "POST", body: fd })
      .then(async (res) => {
        const text = await res.text();
        let data: unknown;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = text;
        }
        console.log("[C&I Contract API] Response", key, "status:", res.status, res.statusText, "body:", data);
      })
      .catch((err) => {
        console.error("[C&I Contract API] Error", key, "file:", file.name, err);
      });
  };

  const CONTRACT_TO_FILING: Record<string, string> = {
    "C&I Electricity": "signed_CI_E", "SME Electricity": "signed_SME_E",
    "C&I Gas": "signed_CI_G", "SME Gas": "signed_SME_G",
    Waste: "signed_WASTE", Oil: "signed_OIL", DMA: "signed_DMA",
  };

  const updateContractStatus = async (
    contractKey: string,
    fileIndex: number,
    newStatus: string
  ) => {
    if (!token || !businessInfo) return;
    const businessNameResolved =
      String(business?.name ?? "").trim() ||
      String(businessName ?? "").trim();
    if (!businessNameResolved) {
      showToast("Missing business name for contract update", "error");
      return;
    }
    const saveKey = `${contractKey}-${fileIndex}`;
    setStatusSavingKey(saveKey);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/contracts/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          business_name: businessNameResolved,
          contract_key: contractKey,
          status: newStatus,
          file_index: fileIndex,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          formatBackendErrorBody(data) || `Status update failed (${res.status})`
        );
      }
      const cell = (data as { updated_status_cell?: string }).updated_status_cell;
      setBusinessInfo((prev) =>
        prev
          ? withUpdatedContractStatus(
              prev,
              contractKey,
              fileIndex,
              newStatus,
              cell ?? null
            )
          : prev
      );
      showToast(`${contractKey} status updated`, "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Status update failed",
        "error"
      );
    } finally {
      setStatusSavingKey(null);
    }
  };

  const contracts = getContractsFromProcessed(processed);

  const sortedContracts = [...contracts].sort((a, b) => {
    const aHas = a.items.length > 0;
    const bHas = b.items.length > 0;
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

  const alintaAgreementHref = () => {
    const p = new URLSearchParams();
    if (clientId != null && Number.isFinite(clientId)) p.set("clientId", String(clientId));
    const qs = p.toString();
    return qs ? `/alinta-gas-agreement-request?${qs}` : "/alinta-gas-agreement-request";
  };

  // ── Upload handlers ────────────────────────────────────────────────────────

  const resetDrive = () => {
    setShowDriveModal(false);
    setDriveFile(null);
    setDriveBatchFiles([]);
    setDriveContractUpdateMode("replace");
    setDriveResult(null);
    setDriveContractKey(null);
  };

  const uploadDrive = async () => {
    if (!token) {
      setDriveResult("Please sign in.");
      return;
    }
    const isSigned = driveFilingType.startsWith("signed_");
    const filesToUpload: File[] =
      isSigned && driveContractUpdateMode === "append_multiple"
        ? driveBatchFiles
        : driveFile
          ? [driveFile]
          : [];
    if (filesToUpload.length === 0) {
      setDriveResult("Please select a file and ensure you are signed in.");
      return;
    }
    setDriveLoading(true);
    setDriveResult(null);
    try {
      const fd = new FormData();
      fd.append("business_name", driveBizName);
      fd.append("filing_type", driveFilingType);
      fd.append("gdrive_url", driveUrl);
      if (isSigned) {
        fd.append("contract_status", driveContractStatus);
        fd.append("contract_update_mode", driveContractUpdateMode);
      }
      for (const f of filesToUpload) {
        fd.append("files", f);
      }
      const res = await fetch(`${getApiBaseUrl()}/api/drive-filing?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      let data: unknown = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      if (!res.ok) {
        const msg = formatBackendErrorBody(data);
        setDriveResult(`Error: ${msg}${res.status ? ` (HTTP ${res.status})` : ""}`);
        showToast(msg, "error");
        return;
      }
      const ok = data as { status?: string; message?: string; filename?: string };
      if (ok.status === "success") {
        setDriveResult("File successfully uploaded!");
        showToast("File uploaded successfully.", "success");
        if (
          driveContractKey === "C&I Electricity" ||
          driveContractKey === "C&I Gas"
        ) {
          for (const f of filesToUpload) {
            silentProcessContract(f, driveContractKey);
          }
        }
        void logMemberUpload({
          upload_kind: "drive_filing",
          filename: ok.filename || filesToUpload[0]?.name || undefined,
          filing_type: driveFilingType,
          utility_key: driveContractKey,
          metadata: {
            contract_status: driveContractStatus,
            contract_update_mode: driveContractUpdateMode,
          },
        });
      } else {
        setDriveResult(`Error: ${formatBackendErrorBody(data)}`);
        showToast(formatBackendErrorBody(data), "error");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setDriveResult(`Error: ${msg}`);
      showToast(msg, "error");
    } finally {
      setDriveLoading(false);
    }
  };

  const uploadAddDoc = async () => {
    if (!business?.name) {
      setAddDocResult("No business name found.");
      return;
    }
    if (!addDocFiles.length) {
      setAddDocResult("No file selected.");
      return;
    }
    if (!addDocType.trim()) {
      setAddDocResult("Please enter a document type.");
      return;
    }

    const files = addDocFiles;
    const lowerNames = files.map((f) => f.name.toLowerCase());
    const isPdf = (name: string) => name.endsWith(".pdf");
    const isImage = (name: string) =>
      name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg");
    const isOffice = (name: string) =>
      [".xlsx", ".xls", ".docx", ".doc"].some((ext) => name.endsWith(ext));

    // Validate file types
    if (
      !files.every((f, idx) => {
        const n = lowerNames[idx];
        return isPdf(n) || isImage(n) || isOffice(n);
      })
    ) {
      setAddDocResult(
        "Please upload only PDF, image (PNG/JPG), Excel (.xlsx, .xls), or Word (.docx, .doc) files.",
      );
      return;
    }

    const hasNonPdfImageOrPdf = files.some((_, idx) => {
      const n = lowerNames[idx];
      return isPdf(n) || isImage(n);
    });

    // When multiple files are selected they must all be PDFs or images
    if (files.length > 1) {
      const allPdfOrImage = files.every((_, idx) => {
        const n = lowerNames[idx];
        return isPdf(n) || isImage(n);
      });
      if (!allPdfOrImage) {
        setAddDocResult(
          "When uploading multiple files, only PDF and image (PNG/JPG) files are supported.",
        );
        return;
      }
    }

    setAddDocLoading(true);
    setAddDocResult("");

    try {
      let uploadFile: File;
      let ext = ".pdf";

      if (files.length === 1) {
        const n = lowerNames[0];
        const single = files[0];
        if (isImage(n) || isPdf(n)) {
          uploadFile = await combineFilesIntoPdf([single]);
          ext = ".pdf";
        } else {
          // Single office document — send as-is
          uploadFile = single;
          ext = n.slice(n.lastIndexOf("."));
        }
      } else {
        // Multiple PDF/images → merge into single PDF
        uploadFile = await combineFilesIntoPdf(files);
        ext = ".pdf";
      }

      const fd = new FormData();
      fd.append("file", uploadFile);
      fd.append("business_name", business.name);
      fd.append("gdrive_url", driveUrl);
      fd.append("timestamp", new Date().toISOString());
      fd.append("new_filename", `${business.name} - ${addDocType}${ext}`);

      const res = await fetch(
        "https://membersaces.app.n8n.cloud/webhook/additional_document_upload",
        { method: "POST", body: fd },
      );
      const text = await res.text();
      let d: any;
      try {
        d = JSON.parse(text);
      } catch {
        d = { message: text };
      }
      if (res.ok) {
        setAddDocResult("Document uploaded successfully!");
        showToast("Document uploaded successfully.", "success");
        const docLink = pickDocumentLinkFromUploadResponse(d);
        void logMemberUpload({
          upload_kind: "additional_document",
          filename: `${business.name} - ${addDocType}${ext}`,
          document_link: docLink,
          metadata: { document_type_label: addDocType.trim() },
        });
        const docTypeNorm = addDocType.trim().toLowerCase();
        console.log(
          "[C&I Contract API] Additional doc upload OK, checking type. docType:",
          JSON.stringify(addDocType),
          "normalized:",
          JSON.stringify(docTypeNorm),
          "isPdf:",
          uploadFile.name.toLowerCase().endsWith(".pdf"),
        );
        if (
          uploadFile.name.toLowerCase().endsWith(".pdf") &&
          (docTypeNorm === "c&i electricity" ||
            docTypeNorm === "ci electricity")
        ) {
          silentProcessContract(uploadFile, "C&I Electricity");
        } else if (
          uploadFile.name.toLowerCase().endsWith(".pdf") &&
          (docTypeNorm === "c&i gas" || docTypeNorm === "ci gas")
        ) {
          silentProcessContract(uploadFile, "C&I Gas");
        }
        setTimeout(() => fetchWIP(), 1000);
        setTimeout(() => {
          setShowAddDocModal(false);
          setAddDocFiles([]);
          setAddDocType("");
          setAddDocResult("");
        }, 2000);
      } else {
        setAddDocResult(`Error: ${d.message || "Failed"}`);
        showToast(d.message || "Upload failed", "error");
      }
    } catch (e: any) {
      setAddDocResult(`Error: ${e?.message}`);
      showToast(e?.message, "error");
    } finally {
      setAddDocLoading(false);
    }
  };

  const uploadEOI = async () => {
    if (!eoiFile) { setEoiResult("No file selected."); return; }
    if (!eoiFile.name.toLowerCase().endsWith(".pdf")) { setEoiResult("Please upload a PDF file."); return; }
    setEoiLoading(true); setEoiResult("");
    try {
      const fd = new FormData(); fd.append("file", eoiFile);
      const res = await fetch("https://aces-invoice-api-672026052958.australia-southeast2.run.app/v1/eoi/process-eoi", { method: "POST", body: fd });
      const d = await res.json().catch(() => ({ message: res.statusText }));
      if (res.ok) {
        setEoiResult("EOI successfully processed and uploaded!");
        showToast("EOI uploaded successfully.", "success");
        void logMemberUpload({
          upload_kind: "eoi",
          filename: eoiFile.name,
          document_link: pickDocumentLinkFromUploadResponse(d),
        });
        setTimeout(() => fetchEOI(), 1500);
      }
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
      if (res.ok) {
        setEfResult("Engagement form uploaded successfully!");
        showToast("Engagement form uploaded.", "success");
        void logMemberUpload({
          upload_kind: "engagement_form",
          filename: file.name,
          document_link: pickDocumentLinkFromUploadResponse(d),
        });
        setTimeout(() => fetchWIP(), 1000);
      }
      else { setEfResult(`Error: ${d.message||res.statusText}`); showToast(d.message||"Upload failed","error"); }
    } catch (e: any) { setEfResult(`Error: ${e?.message}`); showToast(e?.message,"error"); }
    finally { setEfLoading(false); }
  };

  const isSitePhotoFile = (file: File) => {
    const name = file.name.toLowerCase();
    if (/\.(jpe?g|png|webp|gif|heic|heif)$/.test(name)) return true;
    return file.type.toLowerCase().startsWith("image/");
  };

  const uploadSitePhotoFiles = async () => {
    if (!sitePhotoFiles.length) {
      setSitePhotoResult("No photos selected.");
      return;
    }
    if (!driveUrl) {
      setSitePhotoResult("This member has no Google Drive folder.");
      return;
    }
    if (!token) {
      setSitePhotoResult("Sign in required to upload site photos.");
      return;
    }
    if (!sitePhotoFiles.every(isSitePhotoFile)) {
      setSitePhotoResult("Please upload only image files (JPG, PNG, WebP, GIF, HEIC).");
      return;
    }

    setSitePhotoLoading(true);
    setSitePhotoResult("");
    const all = sitePhotoFiles;
    let uploaded = 0;
    const uploadedNames: string[] = [];
    let folderLink: string | undefined;
    const errorMessages: string[] = [];

    try {
      for (let i = 0; i < all.length; i += SITE_PHOTO_BATCH) {
        const slice = all.slice(i, i + SITE_PHOTO_BATCH);
        setSitePhotoProgress(
          `Uploading ${Math.min(i + slice.length, all.length)} / ${all.length}…`,
        );
        const result = await uploadSitePhotos(
          slice,
          business?.name || "",
          driveUrl,
          token,
        );
        uploaded += result.files.length;
        uploadedNames.push(...result.files.map((f) => f.name));
        if (result.folder_url) folderLink = result.folder_url;
        for (const err of result.errors || []) {
          errorMessages.push(`${err.name}: ${err.error}`);
        }
      }
      if (uploaded > 0) {
        showToast(
          uploaded === 1 ? "Site photo uploaded." : `${uploaded} site photos uploaded.`,
          "success",
        );
        void logMemberUpload({
          upload_kind: "site_photo",
          filename:
            uploadedNames.slice(0, 8).join(", ") +
            (uploadedNames.length > 8 ? "…" : ""),
          document_link: folderLink,
          metadata: { count: uploaded },
        });
        setSitePhotoResult(
          errorMessages.length
            ? `Uploaded ${uploaded}. Some files failed: ${errorMessages.slice(0, 3).join(" ")}`
            : "Photos uploaded successfully.",
        );
        await fetchSitePhotosList();
        setTimeout(() => {
          setShowSitePhotosModal(false);
          setSitePhotoFiles([]);
          setSitePhotoResult("");
          setSitePhotoProgress("");
        }, 1500);
      } else {
        const msg = errorMessages[0] || "Upload failed.";
        setSitePhotoResult(msg);
        showToast(msg, "error");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Upload failed.";
      setSitePhotoResult(`Error: ${msg}`);
      showToast(msg, "error");
    } finally {
      setSitePhotoLoading(false);
      setSitePhotoProgress("");
    }
  };

  // ── Derived collections / counts ────────────────────────────────────────────

  const eoiEntries = Object.entries(processed).filter(([k]) =>
    k.startsWith("eoi_")
  );

  const contractCount = contracts.reduce((n, c) => n + c.items.length, 0);
  const contractCategoriesWithFiles = contracts.filter((c) => c.items.length > 0).length;
  const signedViaAcesCount = contracts
    .flatMap((c) => c.items)
    .filter(
      (item) =>
        item.status === BRAND.signedContractStatusValue ||
        item.status?.toLowerCase().includes("signed via aces")
    ).length;

  const businessDocsCount =
    Object.keys(docs)
      .filter((name) => !!getBusinessDocumentFileUrl(name, processed))
      .length +
    (wipUrl ? 1 : 0) +
    (amortExcelUrl || amortPdfUrl ? 1 : 0) +
    (loaUrl ? 1 : 0) +
    (sfaUrl ? 1 : 0);

  const filterCounts: Record<DocFilter, number> = {
    all:
      contractCount +
      businessDocsCount +
      eoiEntries.length +
      engagementForms.length +
      additionalDocs.length +
      sitePhotos.length,
    contracts: contractCount,
    businessDocs: businessDocsCount,
    eois: eoiEntries.length,
    engagement: engagementForms.length,
    additional: additionalDocs.length,
    sitePhotos: sitePhotos.length,
  };

  const listCaption =
    docFilter === "contracts" && contractCategoriesWithFiles > 0
      ? `${contractCategoriesWithFiles} contract${contractCategoriesWithFiles === 1 ? "" : "s"} · ${signedViaAcesCount} signed via ACES`
      : docFilter === "sitePhotos"
        ? `${filterCounts.sitePhotos} photo${filterCounts.sitePhotos === 1 ? "" : "s"}`
        : `${filterCounts[docFilter]} document${filterCounts[docFilter] === 1 ? "" : "s"}`;

  useEffect(() => {
    if (docFilter === "eois") setUploadCategory("eoi");
    else if (docFilter === "engagement") setUploadCategory("engagement");
    else if (docFilter === "additional") setUploadCategory("additional");
    else if (docFilter === "sitePhotos") setUploadCategory("sitePhotos");
  }, [docFilter]);

  const handleRefreshDocuments = () => {
    void fetchEOI();
    void fetchWIP();
    void fetchSitePhotosList();
  };

  const triggerUpload = () => {
    if (uploadCategory === "eoi") {
      setShowEOIModal(true);
      return;
    }
    if (uploadCategory === "engagement") {
      efRef.current?.click();
      return;
    }
    if (uploadCategory === "sitePhotos") {
      setShowSitePhotosModal(true);
      setSitePhotoFiles([]);
      setSitePhotoResult("");
      setSitePhotoProgress("");
      return;
    }
    setShowAddDocModal(true);
    setAddDocFiles([]);
    setAddDocType("");
    setAddDocResult("");
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const matchesSearch = (text: string) =>
    !normalizedSearch || text.toLowerCase().includes(normalizedSearch);

  const businessDocNames = useMemo(
    () =>
      [
        KEY_DOC_LABELS.loa,
        KEY_DOC_LABELS.sfa,
        ...Object.keys(docs),
        KEY_DOC_LABELS.wip,
        KEY_DOC_LABELS.amortisation,
      ]
        .filter((doc, index, arr) => arr.indexOf(doc) === index)
        .sort((docA, docB) => {
          const order = (doc: string) => {
            if (doc === KEY_DOC_LABELS.loa) return 0;
            if (doc === KEY_DOC_LABELS.sfa) return 1;
            if (doc === KEY_DOC_LABELS.wip) return 2;
            if (doc === KEY_DOC_LABELS.amortisation) return 3;
            return 4;
          };
          const oa = order(docA);
          const ob = order(docB);
          if (oa !== ob) return oa - ob;

          const isWipA = docA === KEY_DOC_LABELS.wip;
          const isWipB = docB === KEY_DOC_LABELS.wip;
          const isAmortA = docA === KEY_DOC_LABELS.amortisation;
          const isAmortB = docB === KEY_DOC_LABELS.amortisation;

          const fileUrlA =
            docA === KEY_DOC_LABELS.loa
              ? loaUrl
              : docA === KEY_DOC_LABELS.sfa
                ? sfaUrl
                : isWipA
                  ? wipUrl
                  : isAmortA
                    ? amortExcelUrl || amortPdfUrl
                    : getBusinessDocumentFileUrl(docA, processed);
          const fileUrlB =
            docB === KEY_DOC_LABELS.loa
              ? loaUrl
              : docB === KEY_DOC_LABELS.sfa
                ? sfaUrl
                : isWipB
                  ? wipUrl
                  : isAmortB
                    ? amortExcelUrl || amortPdfUrl
                    : getBusinessDocumentFileUrl(docB, processed);

          if (fileUrlA && !fileUrlB) return -1;
          if (!fileUrlA && fileUrlB) return 1;
          return 0;
        }),
    [docs, loaUrl, sfaUrl, wipUrl, amortExcelUrl, amortPdfUrl, processed]
  );

  const visibleCategories: DocTab[] =
    docFilter === "all"
      ? ["contracts", "businessDocs", "eois", "engagement", "additional", "sitePhotos"]
      : [docFilter];

  const categoryHasVisibleItems = (category: DocTab): boolean => {
    if (category === "contracts") {
      return sortedContracts.some((c) => {
        if (c.items.length === 0) return matchesSearch(c.key);
        return c.items.some((item, idx) =>
          matchesSearch(
            c.items.length > 1 ? `${c.key} (#${idx + 1})` : c.key
          )
        );
      });
    }
    if (category === "businessDocs") {
      return businessDocNames.some((doc) => matchesSearch(displayDocName(doc)));
    }
    if (category === "eois") {
      return eoiEntries.some(([key]) =>
        matchesSearch(key.replace(/^eoi_/, "").replace(/_/g, " "))
      );
    }
    if (category === "engagement") {
      return engagementForms.some((f) => matchesSearch(f.fileName));
    }
    if (category === "sitePhotos") {
      return sitePhotos.some((photo) => matchesSearch(photo.name));
    }
    return additionalDocs.some((doc) => matchesSearch(doc.fileName));
  };

  const hasVisibleDocuments = visibleCategories.some(categoryHasVisibleItems);

  // ── Not loaded state ───────────────────────────────────────────────────────

  if (!businessInfo) {
    return (
      <Panel>
        <div className="px-5 py-12 text-center">
          <EmptyState
            title="No business information loaded yet."
            className="py-6 items-start text-left [&_h3]:text-sm [&_h3]:font-normal [&_h3]:text-gray-400 [&_h3]:mb-0"
          />
          <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Load the member&apos;s business details to see documents.</p>
        </div>
      </Panel>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {driveUrl ? (
        <div className="mb-4">
          <SharedFolderStatusCard
            driveUrl={driveUrl}
            refreshKey={shareRefresh}
            onManage={() => setShareFolderOpen(true)}
          />
        </div>
      ) : null}
      <Panel>
        <div className="space-y-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800/60">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents…"
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <div className="flex flex-wrap gap-2">
            {FILTER_CHIPS.map((chip) => {
              const isActive = docFilter === chip.id;
              const count = filterCounts[chip.id];
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setDocFilter(chip.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  )}
                >
                  {chip.label}
                  {count > 0 && (
                    <span
                      className={cn(
                        "inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                      )}
                    >
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-gray-50/40 px-5 py-2 dark:border-gray-800/60 dark:bg-gray-900/20">
          <p className="min-w-0 text-[11px] font-medium text-gray-500 dark:text-gray-400">
            {listCaption}
          </p>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              radius="md"
              onClick={handleRefreshDocuments}
              disabled={eoiRefreshing || wipLoading || sitePhotosLoading}
              loading={eoiRefreshing || wipLoading || sitePhotosLoading}
            >
              {eoiRefreshing || wipLoading || sitePhotosLoading ? "Refreshing…" : "Refresh"}
            </Button>
            {sitePhotosFolderUrl &&
            (docFilter === "sitePhotos" || uploadCategory === "sitePhotos") ? (
              <a
                href={sitePhotosFolderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-primary hover:underline"
              >
                Open folder
              </a>
            ) : null}
            <select
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value as UploadCategory)}
              className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              <option value="eoi">Signed EOI</option>
              <option value="engagement">Engagement form</option>
              <option value="additional">Additional document</option>
              <option value="sitePhotos">Site photos</option>
            </select>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              radius="md"
              onClick={triggerUpload}
              disabled={efLoading && uploadCategory === "engagement"}
              loading={efLoading && uploadCategory === "engagement"}
            >
              {efLoading && uploadCategory === "engagement" ? "Uploading…" : "Upload"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              radius="md"
              onClick={() => window.open(alintaAgreementHref(), "_blank", "noopener,noreferrer")}
            >
              Send Alinta gas agreement
            </Button>
          </div>
        </div>

        <div className="px-5 py-5">
          {efResult && (
            <div className="mb-3">
              <Alert msg={efResult} successStart="Engagement form uploaded" />
            </div>
          )}
          {!hasVisibleDocuments ? (
            <EmptyState
              title={
                normalizedSearch
                  ? "No documents match your search."
                  : docFilter === "sitePhotos"
                    ? sitePhotosLoading
                      ? "Loading site photos…"
                      : !driveUrl
                        ? "This member has no Google Drive folder."
                        : "No site photos yet."
                    : "No documents in this category yet."
              }
              className="py-6 items-start text-left [&_h3]:text-sm [&_h3]:font-normal [&_h3]:text-gray-400 [&_h3]:mb-0"
            />
          ) : (
            <div className="space-y-5">
              {visibleCategories.map((category) => {
                if (!categoryHasVisibleItems(category)) return null;
                return (
                  <div key={category}>
                    {docFilter === "all" && (
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                        {CATEGORY_SECTION_LABELS[category]}
                      </p>
                    )}
                    <div className="divide-y divide-gray-50 dark:divide-gray-800/40 -mx-4">
                      {category === "contracts" &&
                        sortedContracts.flatMap((c) => {
                          const categoryIcon = getRecordRowIcon(c.key);
                          const openFileModal = () => {
                            setDriveFilingType(
                              CONTRACT_TO_FILING[c.key] ??
                                c.key.toLowerCase().replace(/[^a-z0-9]+/g, "_")
                            );
                            setDriveBizName(business?.name || "");
                            setDriveContractKey(c.key);
                            setDriveContractUpdateMode("replace");
                            setDriveResult(null);
                            setDriveFile(null);
                            setDriveBatchFiles([]);
                            setShowDriveModal(true);
                          };

                          if (c.items.length === 0) {
                            if (!matchesSearch(c.key)) return [];
                            return (
                              <RecordRow
                                key={c.key}
                                leadingIcon={categoryIcon.icon}
                                iconIntent={categoryIcon.intent}
                                title={c.key}
                                status={contractStatusBadge(undefined, false)}
                                muted
                                actions={
                                  <>
                                    <DocSecondaryBtn onClick={openFileModal}>File</DocSecondaryBtn>
                                    {c.key === "C&I Gas" ? (
                                      <DocSecondaryBtn
                                        onClick={() =>
                                          window.open(alintaAgreementHref(), "_blank", "noopener,noreferrer")
                                        }
                                      >
                                        Alinta EF
                                      </DocSecondaryBtn>
                                    ) : null}
                                  </>
                                }
                              />
                            );
                          }

                          return c.items
                            .map((item, idx) => {
                              const title =
                                c.items.length > 1 ? `${c.key} (#${idx + 1})` : c.key;
                              if (!matchesSearch(title)) return null;
                              const rowKey = `${c.key}-${idx}`;
                              const saving = statusSavingKey === rowKey;
                              const uploaded = uploadedLabel(dateFor(item.url));
                              return (
                                <RecordRow
                                  key={rowKey}
                                  leadingIcon={categoryIcon.icon}
                                  iconIntent={categoryIcon.intent}
                                  title={title}
                                  subtitle={uploaded}
                                  status={
                                    <div className="flex flex-col items-end gap-1">
                                      {contractStatusBadge(item.status, !!item.url)}
                                      <select
                                        aria-label={`${title} contract status`}
                                        disabled={saving || !token}
                                        value={item.status || ""}
                                        onChange={(e) =>
                                          updateContractStatus(
                                            c.key,
                                            idx,
                                            e.target.value
                                          )
                                        }
                                        className="max-w-[12rem] rounded-md border border-stroke/60 bg-white px-1.5 py-1 text-[11px] text-gray-700 dark:border-dark-3 dark:bg-dark-2 dark:text-gray-200"
                                      >
                                        <option value="">No status</option>
                                        {CONTRACT_STATUS_OPTIONS.map((opt) => (
                                          <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                          </option>
                                        ))}
                                        {item.status &&
                                          !CONTRACT_STATUS_OPTIONS.some(
                                            (o) => o.value === item.status
                                          ) && (
                                            <option value={item.status}>
                                              {item.status}
                                            </option>
                                          )}
                                      </select>
                                    </div>
                                  }
                                  muted={!item.url}
                                  actions={
                                    <>
                                      {item.url ? (
                                        <RecordRowOpenAction href={item.url} />
                                      ) : null}
                                      {idx === 0 ? (
                                        <DocSecondaryBtn onClick={openFileModal}>
                                          File
                                        </DocSecondaryBtn>
                                      ) : null}
                                      {c.key === "C&I Gas" && idx === 0 ? (
                                        <DocSecondaryBtn
                                          onClick={() =>
                                            window.open(
                                              alintaAgreementHref(),
                                              "_blank",
                                              "noopener,noreferrer",
                                            )
                                          }
                                        >
                                          Alinta EF
                                        </DocSecondaryBtn>
                                      ) : null}
                                    </>
                                  }
                                />
                              );
                            })
                            .filter(Boolean);
                        })}

                      {category === "businessDocs" &&
                        businessDocNames.map((doc) => {
                          const isLoa = doc === KEY_DOC_LABELS.loa;
                          const isSfa = doc === KEY_DOC_LABELS.sfa;
                          const isWip = doc === KEY_DOC_LABELS.wip;
                          const isAmort = doc === KEY_DOC_LABELS.amortisation;
                          const fileUrl = isLoa
                            ? loaUrl
                            : isSfa
                              ? sfaUrl
                              : isWip
                                ? wipUrl
                                : isAmort
                                  ? amortExcelUrl || amortPdfUrl
                                  : getBusinessDocumentFileUrl(doc, processed);
                          const title = displayDocName(doc);
                          if (!matchesSearch(title)) return null;
                          const docIcon = getRecordRowIcon(doc);
                          const uploaded = uploadedLabel(
                            dateFor(
                              isAmort ? amortExcelUrl || amortPdfUrl : fileUrl,
                            ),
                          );
                          return (
                            <RecordRow
                              key={doc}
                              leadingIcon={docIcon.icon}
                              iconIntent={docIcon.intent}
                              title={title}
                              subtitle={
                                <>
                                  {isAmort ? (
                                    <>
                                      {amortExcelUrl && (
                                        <>
                                          <FileLink label="Excel" url={amortExcelUrl} />
                                          {amortPdfUrl && " | "}
                                        </>
                                      )}
                                      {amortPdfUrl && <FileLink label="PDF" url={amortPdfUrl} />}
                                      {!amortExcelUrl && !amortPdfUrl && "Not available"}
                                    </>
                                  ) : fileUrl ? (
                                    <FileLink
                                      label={isLoa || isSfa ? "Open file" : "View File"}
                                      url={fileUrl}
                                    />
                                  ) : (
                                    "Not available"
                                  )}
                                  {uploaded ? <span className="block">{uploaded}</span> : null}
                                </>
                              }
                              status={
                                fileUrl || amortExcelUrl || amortPdfUrl ? (
                                  <Badge intent="success" shape="pill">
                                    Available
                                  </Badge>
                                ) : (
                                  <Badge intent="neutral" shape="pill">
                                    Not available
                                  </Badge>
                                )
                              }
                              muted={!fileUrl && !amortExcelUrl && !amortPdfUrl}
                              actions={
                                !isWip && !isAmort ? (
                                  <>
                                    <DocSecondaryBtn
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
                                        setDriveContractUpdateMode("replace");
                                        setDriveBatchFiles([]);
                                        setDriveResult(null);
                                        setDriveFile(null);
                                        setShowDriveModal(true);
                                      }}
                                    >
                                      File
                                    </DocSecondaryBtn>
                                    {(doc === "Site Profling" || doc === "Site Profiling") && (
                                      <DocSecondaryBtn onClick={openSiteProfiling}>
                                        New
                                      </DocSecondaryBtn>
                                    )}
                                  </>
                                ) : undefined
                              }
                            />
                          );
                        })}

                      {category === "eois" &&
                        eoiEntries.map(([key, url]) => {
                          const title = key.replace(/^eoi_/, "").replace(/_/g, " ");
                          if (!matchesSearch(title)) return null;
                          const uploaded = uploadedLabel(dateFor(String(url)));
                          return (
                            <RecordRow
                              key={key}
                              leadingIcon={FileText}
                              iconIntent="neutral"
                              title={title}
                              subtitle={uploaded}
                              status={
                                <Badge intent="success" shape="pill">
                                  Available
                                </Badge>
                              }
                              actions={<RecordRowOpenAction href={String(url)} />}
                            />
                          );
                        })}

                      {category === "engagement" &&
                        engagementForms.map((f) => {
                          if (!matchesSearch(f.fileName)) return null;
                          const uploaded = uploadedLabel(dateFor(f.id, f.uploadedAt));
                          return (
                            <RecordRow
                              key={f.id}
                              leadingIcon={FileText}
                              iconIntent="neutral"
                              title={f.fileName}
                              subtitle={uploaded}
                              status={
                                <Badge intent="success" shape="pill">
                                  Signed
                                </Badge>
                              }
                              actions={<RecordRowOpenAction href={driveFileUrl(f.id)} />}
                            />
                          );
                        })}

                      {category === "additional" &&
                        additionalDocs.map((doc) => {
                          if (!matchesSearch(doc.fileName)) return null;
                          const uploaded = uploadedLabel(dateFor(doc.id, doc.uploadedAt));
                          return (
                            <RecordRow
                              key={doc.id}
                              leadingIcon={FileText}
                              iconIntent="neutral"
                              title={doc.fileName}
                              subtitle={uploaded}
                              status={
                                <Badge intent="success" shape="pill">
                                  Available
                                </Badge>
                              }
                              actions={<RecordRowOpenAction href={driveFileUrl(doc.id)} />}
                            />
                          );
                        })}

                      {category === "sitePhotos" && (
                        <div className="px-4 py-1">
                          <SitePhotosGallery
                            photos={sitePhotos.filter((photo) => matchesSearch(photo.name))}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
          <MField label="Upload mode">
            <div className="flex flex-col gap-2 mt-0.5 text-sm text-gray-700 dark:text-gray-300">
              {(
                [
                  ["replace", "Replace contract — overwrites stored file ID(s)"],
                  ["append", "Add to contract — append one file ID (comma-separated)"],
                  ["append_multiple", "Multiple files — append all file IDs at once"],
                ] as const
              ).map(([mode, label]) => (
                <label key={mode} className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="driveContractMode"
                    checked={driveContractUpdateMode === mode}
                    onChange={() => {
                      setDriveContractUpdateMode(mode);
                      setDriveFile(null);
                      setDriveBatchFiles([]);
                    }}
                    className="accent-gray-900 dark:accent-white mt-1"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </MField>
        )}
        {driveFilingType.startsWith("signed_") && (
          <MField label="Contract Status">
            <div className="flex flex-col gap-2 mt-0.5">
              {CONTRACT_STATUS_OPTIONS.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                  <input type="radio" name="driveStatus" checked={driveContractStatus === value} onChange={() => setDriveContractStatus(value)} className="accent-gray-900 dark:accent-white" />
                  {label}
                </label>
              ))}
            </div>
          </MField>
        )}
        <MField
          label={
            driveFilingType.startsWith("signed_") &&
            driveContractUpdateMode === "append_multiple"
              ? "Files"
              : "File"
          }
        >
          {driveFilingType.startsWith("signed_") &&
          driveContractUpdateMode === "append_multiple" ? (
            <div className="rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 px-3 py-2.5">
              <input
                type="file"
                multiple
                onChange={(e) =>
                  setDriveBatchFiles(
                    e.target.files ? Array.from(e.target.files) : [],
                  )
                }
                className="block w-full text-xs text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-gray-100 dark:file:bg-gray-800 file:text-gray-700 dark:file:text-gray-200 hover:file:bg-gray-200 dark:hover:file:bg-gray-700 file:cursor-pointer file:transition-colors"
              />
              {driveBatchFiles.length > 0 && (
                <ul className="mt-1 text-[11px] text-gray-400 space-y-0.5 max-h-24 overflow-auto">
                  {driveBatchFiles.map((f) => (
                    <li key={f.name + f.size} className="truncate">
                      {f.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <FileDropInput onChange={setDriveFile} file={driveFile} />
          )}
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
              className="text-xs font-semibold text-primary hover:underline"
            >
              Lodge Agreement with Retailer →
            </a>
            {driveContractKey === "C&I Gas" && (
              <div className="mt-2">
                <a
                  href={alintaAgreementHref()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Send Alinta gas agreement →
                </a>
              </div>
            )}
          </div>
        )}
        <MFooter
          onCancel={resetDrive}
          onSubmit={uploadDrive}
          label="Upload"
          disabled={
            driveFilingType.startsWith("signed_") &&
            driveContractUpdateMode === "append_multiple"
              ? driveBatchFiles.length === 0
              : !driveFile
          }
          loading={driveLoading}
        />
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
        <MField label="Files — PDF, images, Excel, or Word">
          <div className="rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 px-3 py-2.5">
            <input
              type="file"
              accept=".pdf,.xlsx,.xls,.docx,.doc,image/png,image/jpeg,image/jpg,.png,.jpg,.jpeg"
              multiple
              onChange={(e) =>
                setAddDocFiles(
                  e.target.files ? Array.from(e.target.files) : [],
                )
              }
              className="block w-full text-xs text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-gray-100 dark:file:bg-gray-800 file:text-gray-700 dark:file:text-gray-200 hover:file:bg-gray-200 dark:hover:file:bg-gray-700 file:cursor-pointer file:transition-colors"
            />
            {addDocFiles.length > 0 && (
              <ul className="mt-1 text-[11px] text-gray-400 space-y-0.5 max-h-24 overflow-auto">
                {addDocFiles.map((f) => (
                  <li key={f.name} className="truncate">
                    {f.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </MField>
        {addDocResult && <Alert msg={addDocResult} successStart="Document uploaded" />}
        <MFooter onCancel={() => setShowAddDocModal(false)} onSubmit={uploadAddDoc} label="Upload" disabled={!addDocFiles.length || !addDocType.trim()} loading={addDocLoading} />
      </Modal>

      {/* ── EOI modal ── */}
      <Modal open={showEOIModal} onClose={() => !eoiLoading && setShowEOIModal(false)} title="Upload EOI">
        <MField label="PDF File">
          <FileDropInput accept=".pdf" onChange={setEoiFile} file={eoiFile} />
        </MField>
        {eoiResult && <Alert msg={eoiResult} successStart="EOI successfully" />}
        <MFooter onCancel={() => setShowEOIModal(false)} onSubmit={uploadEOI} label="Upload" disabled={!eoiFile} loading={eoiLoading} />
      </Modal>

      <Modal
        open={showSitePhotosModal}
        onClose={() => !sitePhotoLoading && setShowSitePhotosModal(false)}
        title="Upload Site Photos"
      >
        <MField label="Photos — JPG, PNG, WebP, GIF, or HEIC">
          <div className="rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 px-3 py-2.5">
            <input
              type="file"
              accept={SITE_PHOTO_ACCEPT}
              multiple
              onChange={(e) =>
                setSitePhotoFiles(e.target.files ? Array.from(e.target.files) : [])
              }
              className="block w-full text-xs text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-gray-100 dark:file:bg-gray-800 file:text-gray-700 dark:file:text-gray-200 hover:file:bg-gray-200 dark:hover:file:bg-gray-700 file:cursor-pointer file:transition-colors"
            />
            {sitePhotoFiles.length > 0 && (
              <p className="mt-1.5 text-[11px] text-gray-400">
                {sitePhotoFiles.length} photo{sitePhotoFiles.length === 1 ? "" : "s"} selected
              </p>
            )}
          </div>
        </MField>
        {sitePhotoProgress ? (
          <p className="text-xs text-gray-500">{sitePhotoProgress}</p>
        ) : null}
        {sitePhotoResult && <Alert msg={sitePhotoResult} successStart="Photos uploaded" />}
        <MFooter
          onCancel={() => setShowSitePhotosModal(false)}
          onSubmit={uploadSitePhotoFiles}
          label={
            sitePhotoFiles.length > 1
              ? `Upload ${sitePhotoFiles.length} photos`
              : "Upload"
          }
          disabled={!sitePhotoFiles.length || !driveUrl}
          loading={sitePhotoLoading}
        />
      </Modal>

      <ShareFolderModal
        open={shareFolderOpen}
        onClose={() => setShareFolderOpen(false)}
        driveUrl={driveUrl}
        businessName={business?.name || businessName || ""}
        defaultEmail={defaultShareEmail(info, typeof contact.email === "string" ? contact.email : "")}
        onShared={() => setShareRefresh((n) => n + 1)}
      />
    </>
  );
}