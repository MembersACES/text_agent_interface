"use client";

import { useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ExtraColour {
  label: string;
  hex: string;
}

interface GenerateResult {
  success: boolean;
  image_url?: string;
  image_base64?: string;
  file_id?: string;
  error?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r} ${g} ${b}`;
}

function extractDriveFileIdFromUrl(url: string): string | null {
  const m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  return m?.[1] ?? null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function ColourSwatch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="colour-field">
      <label className="field-label">{label}</label>
      <div className="colour-input-row">
        <div className="swatch-wrap" style={{ background: value }}>
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="colour-native"
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="hex-input"
          maxLength={7}
          spellCheck={false}
        />
      </div>
    </div>
  );
}

function StatusPill({ state }: { state: "idle" | "loading" | "success" | "error" }) {
  const map = {
    idle: { label: "Ready", cls: "pill-idle" },
    loading: { label: "Generating…", cls: "pill-loading" },
    success: { label: "Complete", cls: "pill-success" },
    error: { label: "Failed", cls: "pill-error" },
  };
  const { label, cls } = map[state];
  return <span className={`status-pill ${cls}`}>{label}</span>;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function VinylRobotWrapPage() {
  const params = useSearchParams();

  // Pre-fill from URL params
  const [businessName, setBusinessName] = useState(params.get("businessName") ?? "");
  const [tradingAs, setTradingAs] = useState(params.get("tradingAs") ?? "");
  const [contactName, setContactName] = useState(params.get("contactName") ?? "");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [siteAddress, setSiteAddress] = useState(params.get("siteAddress") ?? "");
  const [website, setWebsite] = useState(params.get("website") ?? "");
  const [clientId, setClientId] = useState(params.get("clientId") ?? "");
  const [clientFolderUrl] = useState(params.get("clientFolderUrl") ?? "");

  // Brand
  const [primary, setPrimary] = useState("#1a1a1a");
  const [secondary, setSecondary] = useState("#5750F1");
  const [textColour, setTextColour] = useState("#FFFFFF");
  const [extraColours, setExtraColours] = useState<ExtraColour[]>([]);

  // Logo
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoDescription, setLogoDescription] = useState("");

  // Extra
  const [extraDetails, setExtraDetails] = useState("");
  const [showPrompt, setShowPrompt] = useState(false);

  // Result
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editInstructions, setEditInstructions] = useState("");
  const [regenerating, setRegenerating] = useState(false);

  const resultRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to result when it arrives
  useEffect(() => {
    if (status === "success" && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [status]);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setLogoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setLogoPreview(null);
    }
  }

  function clearLogo() {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function addExtraColour() {
    setExtraColours([...extraColours, { label: "", hex: "#000000" }]);
  }

  function updateExtraColour(i: number, field: keyof ExtraColour, val: string) {
    setExtraColours(extraColours.map((c, idx) => (idx === i ? { ...c, [field]: val } : c)));
  }

  function removeExtraColour(i: number) {
    setExtraColours(extraColours.filter((_, idx) => idx !== i));
  }

  async function toBase64(file: File): Promise<string> {
    return new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        res(result.split(",")[1]);
      };
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });
  }

  async function handleGenerate() {
    setStatus("loading");
    setResult(null);
    setErrorMsg("");

    try {
      let logoPayload = undefined;
      if (logoFile) {
        const b64 = await toBase64(logoFile);
        logoPayload = {
          filename: logoFile.name,
          mime_type: logoFile.type,
          base64: b64,
        };
      }

      const payload = {
        client: {
          name: businessName,
          trading_as: tradingAs,
          contact_name: contactName,
          email,
          site_address: siteAddress,
          website,
          client_id: clientId,
          client_folder_url: clientFolderUrl,
        },
        brand: {
          primary_colour: primary,
          secondary_colour: secondary,
          text_colour: textColour,
          extra_colours: extraColours.filter((c) => c.label && c.hex),
        },
        logo: logoPayload,
        logo_description: logoDescription,
        extra_details: extraDetails,
      };

      const res = await fetch("/api/vinyl-robot-wrap/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: GenerateResult = await res.json();

      if (data.success) {
        setResult(data);
        setStatus("success");
      } else {
        setErrorMsg(data.error ?? "Generation failed.");
        setStatus("error");
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Unknown error");
      setStatus("error");
    }
  }

  const currentFileId =
    result?.file_id || (result?.image_url ? extractDriveFileIdFromUrl(result.image_url) : null);

  async function handleRegenerateWrap() {
    if (!currentFileId) {
      setErrorMsg("No file ID found for this wrap. Ensure n8n returns file_id or a Google Drive file URL.");
      return;
    }
    const editPrompt = editInstructions.trim();
    if (!editPrompt) {
      setErrorMsg("Please add the edit instructions.");
      return;
    }

    let logoPayload: { filename: string; mime_type: string; base64: string } | undefined;
    if (logoFile) {
      try {
        const b64 = await toBase64(logoFile);
        logoPayload = {
          filename: logoFile.name,
          mime_type: logoFile.type,
          base64: b64,
        };
      } catch {
        setErrorMsg("Could not read the logo file for regeneration.");
        return;
      }
    }

    setErrorMsg("");
    setRegenerating(true);
    try {
      const res = await fetch("/api/vinyl-robot-wrap/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_id: currentFileId,
          edit_prompt: editPrompt,
          business_name: businessName || undefined,
          logo: logoPayload,
          logo_description: logoDescription || undefined,
        }),
      });
      const data: GenerateResult = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error ?? "Regeneration failed.");
        return;
      }
      setResult(data);
      setStatus("success");
      setShowEditModal(false);
      setEditInstructions("");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setRegenerating(false);
    }
  }

  const imageSrc = result?.image_base64
    ? `data:image/png;base64,${result.image_base64}`
    : result?.image_url ?? null;

  const promptPreview = `Client: ${businessName || "(none)"}
Primary: ${primary} | Secondary: ${secondary} | Text: ${textColour}
${extraColours.length ? "Extra: " + extraColours.map((c) => `${c.label} ${c.hex}`).join(", ") : ""}
Logo: ${logoFile ? logoFile.name : "none"}${logoDescription ? ` — ${logoDescription}` : ""}
${extraDetails ? `Notes: ${extraDetails}` : ""}`.trim();

  async function handleDownloadPdf() {
    if (!imageSrc) return;
    try {
      const { jsPDF } = await import("jspdf/dist/jspdf.umd.min.js");
      const img = new Image();
      img.crossOrigin = "anonymous";
      const imageLoaded = new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Could not load image for PDF download."));
      });
      img.src = imageSrc;
      await imageLoaded;

      const pdf = new jsPDF({
        orientation: img.width >= img.height ? "landscape" : "portrait",
        unit: "pt",
        format: "a4",
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const fitRatio = Math.min(pageWidth / img.width, pageHeight / img.height);
      const drawW = img.width * fitRatio;
      const drawH = img.height * fitRatio;
      const x = (pageWidth - drawW) / 2;
      const y = (pageHeight - drawH) / 2;
      pdf.addImage(img, "PNG", x, y, drawW, drawH);
      pdf.save(`${businessName || "vinyl-wrap"}-mockup.pdf`);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Could not download PDF.");
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        :root {
          --bg: transparent;
          --surface: #f8f8fb;
          --surface2: #f1f1f6;
          --border: #e2e2ea;
          --border-bright: #c8c8d8;
          --accent: #6c63ff;
          --accent2: #ff6b6b;
          --gold: #f5c842;
          --text: #1a1a2e;
          --muted: #6b6b80;
          --success: #16a34a;
          --error: #dc2626;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .vw-page {
          min-height: 100vh;
          font-family: 'DM Sans', sans-serif;
          color: var(--text);
          padding: 0 0 80px;
        }

        /* ── Header ── */
        .vw-header {
          padding: 32px 48px 24px;
          border-bottom: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 12px;
        }

        .vw-header-left h1 {
          font-family: 'Syne', sans-serif;
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: #1a1a2e;
          line-height: 1.1;
          text-align: center;
        }

        .vw-header-left h1 span {
          color: var(--accent);
        }

        .vw-header-left p {
          margin-top: 6px;
          font-size: 0.82rem;
          color: var(--muted);
          letter-spacing: 0.02em;
          text-align: center;
        }

        .vw-header-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 100px;
          padding: 6px 14px 6px 8px;
          font-size: 0.75rem;
          color: var(--muted);
        }

        .vw-header-badge-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 8px var(--accent);
        }

        /* ── Layout ── */
        .vw-body {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          min-height: calc(100vh - 120px);
        }

        .vw-left {
          padding: 40px 48px;
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .vw-right {
          padding: 40px 48px;
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        /* ── Section ── */
        .vw-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .section-heading {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: 'Syne', sans-serif;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--muted);
        }

        .section-heading::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border);
        }

        /* ── Fields ── */
        .field-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .field-grid.full {
          grid-template-columns: 1fr;
        }

        .field-wrap {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .field-label {
          font-size: 0.7rem;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--muted);
        }

        .field-input {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 0.85rem;
          color: var(--text);
          font-family: 'DM Sans', sans-serif;
          transition: border-color 0.15s, box-shadow 0.15s;
          outline: none;
          width: 100%;
        }

        .field-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(108,99,255,0.12);
        }

        textarea.field-input {
          resize: vertical;
          min-height: 80px;
        }

        /* ── Colour ── */
        .colour-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
        }

        .colour-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .colour-input-row {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 6px 10px;
          transition: border-color 0.15s;
        }

        .colour-input-row:focus-within {
          border-color: var(--accent);
        }

        .swatch-wrap {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          cursor: pointer;
          flex-shrink: 0;
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .colour-native {
          position: absolute;
          inset: -4px;
          width: calc(100% + 8px);
          height: calc(100% + 8px);
          opacity: 0;
          cursor: pointer;
        }

        .hex-input {
          background: none;
          border: none;
          outline: none;
          font-size: 0.82rem;
          color: var(--text);
          font-family: 'DM Mono', monospace;
          width: 100%;
          letter-spacing: 0.05em;
        }

        /* Extra colours */
        .extra-colour-row {
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 8px;
          align-items: center;
        }

        .btn-ghost-sm {
          background: none;
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--muted);
          font-size: 0.75rem;
          padding: 6px 10px;
          cursor: pointer;
          transition: all 0.15s;
          font-family: 'DM Sans', sans-serif;
        }

        .btn-ghost-sm:hover {
          border-color: var(--border-bright);
          color: var(--text);
        }

        .btn-add-colour {
          background: none;
          border: 1px dashed var(--border);
          border-radius: 8px;
          color: var(--muted);
          font-size: 0.8rem;
          padding: 8px 14px;
          cursor: pointer;
          transition: all 0.15s;
          font-family: 'DM Sans', sans-serif;
          text-align: left;
        }

        .btn-add-colour:hover {
          border-color: var(--accent);
          color: var(--accent);
        }

        /* ── Logo upload ── */
        .logo-upload-area {
          border: 1px dashed var(--border);
          border-radius: 12px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.2s;
          background: var(--surface2);
          position: relative;
        }

        .logo-upload-area:hover {
          border-color: var(--accent);
          background: rgba(108,99,255,0.04);
        }

        .logo-upload-area input[type="file"] {
          position: absolute;
          inset: 0;
          opacity: 0;
          cursor: pointer;
        }

        .logo-preview-wrap {
          position: relative;
          display: inline-flex;
        }

        .logo-preview-img {
          max-height: 80px;
          max-width: 200px;
          object-fit: contain;
          border-radius: 6px;
        }

        .logo-clear-btn {
          position: absolute;
          top: -8px;
          right: -8px;
          background: var(--error);
          border: none;
          border-radius: 50%;
          width: 22px;
          height: 22px;
          font-size: 0.7rem;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        }

        .logo-upload-icon {
          font-size: 2rem;
          opacity: 0.3;
        }

        .logo-upload-text {
          font-size: 0.8rem;
          color: var(--muted);
          text-align: center;
        }

        .logo-upload-text strong {
          color: var(--accent);
          font-weight: 500;
        }

        /* ── Prompt preview ── */
        .prompt-toggle {
          background: none;
          border: none;
          color: var(--muted);
          font-size: 0.78rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0;
          font-family: 'DM Sans', sans-serif;
          transition: color 0.15s;
        }

        .prompt-toggle:hover { color: var(--text); }

        .prompt-box {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 14px;
          font-size: 0.72rem;
          color: var(--muted);
          line-height: 1.7;
          font-family: 'DM Mono', monospace;
          white-space: pre-wrap;
          max-height: 160px;
          overflow-y: auto;
        }

        /* ── Generate button ── */
        .btn-generate {
          width: 100%;
          padding: 16px 24px;
          background: var(--accent);
          border: none;
          border-radius: 12px;
          color: white;
          font-family: 'Syne', sans-serif;
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          overflow: hidden;
        }

        .btn-generate::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 60%);
          pointer-events: none;
        }

        .btn-generate:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 32px rgba(108,99,255,0.4);
        }

        .btn-generate:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .btn-generate.loading {
          background: var(--surface2);
          border: 1px solid var(--border);
          color: var(--muted);
        }

        /* ── Status pill ── */
        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          font-weight: 500;
          padding: 4px 10px;
          border-radius: 100px;
          letter-spacing: 0.05em;
        }

        .status-pill::before {
          content: '';
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .pill-idle { background: rgba(107,107,128,0.15); color: var(--muted); }
        .pill-idle::before { background: var(--muted); }
        .pill-loading { background: rgba(108,99,255,0.15); color: var(--accent); }
        .pill-loading::before { background: var(--accent); animation: pulse 1s infinite; }
        .pill-success { background: rgba(74,222,128,0.15); color: var(--success); }
        .pill-success::before { background: var(--success); }
        .pill-error { background: rgba(248,113,113,0.15); color: var(--error); }
        .pill-error::before { background: var(--error); }

        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }

        /* ── Result panel ── */
        .result-panel {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
          flex: 1;
        }

        .result-panel-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .result-panel-title {
          font-family: 'Syne', sans-serif;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--muted);
        }

        .result-panel-body {
          padding: 24px;
        }

        /* Loading skeleton */
        .result-skeleton {
          width: 100%;
          aspect-ratio: 16/9;
          background: linear-gradient(
            90deg,
            var(--surface2) 0%,
            var(--border) 50%,
            var(--surface2) 100%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .skeleton-label {
          font-size: 0.8rem;
          color: var(--muted);
          animation: pulse 1.5s infinite;
        }

        .result-image {
          width: 100%;
          border-radius: 10px;
          display: block;
          border: 1px solid var(--border);
        }

        .result-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 16px;
        }

        .result-actions-row {
          display: flex;
          gap: 10px;
        }

        .btn-action {
          flex: 1;
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          font-family: 'DM Sans', sans-serif;
          text-align: center;
          text-decoration: none;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .btn-action-primary {
          background: var(--accent);
          border: none;
          color: white;
        }

        .btn-action-primary:hover { opacity: 0.9; }

        .btn-action-secondary {
          background: none;
          border: 1px solid var(--border);
          color: var(--muted);
        }

        .btn-action-secondary:hover {
          border-color: var(--border-bright);
          color: var(--text);
        }

        .btn-action-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .error-box {
          background: rgba(248,113,113,0.08);
          border: 1px solid rgba(248,113,113,0.2);
          border-radius: 10px;
          padding: 16px;
          font-size: 0.82rem;
          color: var(--error);
          line-height: 1.6;
        }

        .edit-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.42);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 120;
          padding: 20px;
        }

        .edit-modal {
          width: min(620px, 100%);
          background: #fff;
          border: 1px solid var(--border);
          border-radius: 14px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
          padding: 18px;
        }

        .edit-modal-title {
          font-family: 'Syne', sans-serif;
          font-size: 1rem;
          font-weight: 700;
          margin-bottom: 10px;
          color: var(--text);
        }

        .edit-modal-help {
          color: var(--muted);
          font-size: 0.8rem;
          margin-bottom: 10px;
        }

        .edit-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 12px;
        }

        /* Empty state */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 24px;
          gap: 12px;
          color: var(--muted);
          text-align: center;
        }

        .empty-state-icon {
          font-size: 3rem;
          opacity: 0.2;
        }

        .empty-state p {
          font-size: 0.82rem;
          max-width: 200px;
          line-height: 1.6;
        }

        /* Responsive */
        @media (max-width: 900px) {
          .vw-body { grid-template-columns: 1fr; }
          .vw-left { border-right: none; border-bottom: 1px solid var(--border); }
          .vw-header { padding: 24px; }
          .vw-left, .vw-right { padding: 24px; }
          .colour-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      <div className="vw-page">

        <div className="vw-body">
          {/* ── LEFT: Form ── */}
          <div className="vw-left">

            {/* Member Context */}
            <div className="vw-section">
              <div className="section-heading">Member context</div>
              <div className="field-grid">
                <div className="field-wrap">
                  <label className="field-label">Business Name</label>
                  <input className="field-input" value={businessName} onChange={e => setBusinessName(e.target.value)} />
                </div>
                <div className="field-wrap">
                  <label className="field-label">Trading As</label>
                  <input className="field-input" value={tradingAs} onChange={e => setTradingAs(e.target.value)} />
                </div>
                <div className="field-wrap">
                  <label className="field-label">Contact Name</label>
                  <input className="field-input" value={contactName} onChange={e => setContactName(e.target.value)} />
                </div>
                <div className="field-wrap">
                  <label className="field-label">CRM Client ID</label>
                  <input className="field-input" value={clientId} onChange={e => setClientId(e.target.value)} />
                </div>
                <div className="field-wrap">
                  <label className="field-label">Email</label>
                  <input className="field-input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="field-wrap">
                  <label className="field-label">Website</label>
                  <input className="field-input" value={website} onChange={e => setWebsite(e.target.value)} />
                </div>
              </div>
              <div className="field-wrap">
                <label className="field-label">Site Address</label>
                <input className="field-input" value={siteAddress} onChange={e => setSiteAddress(e.target.value)} />
              </div>
            </div>

            {/* Brand Colours */}
            <div className="vw-section">
              <div className="section-heading">Brand colours</div>
              <div className="colour-grid">
                <ColourSwatch label="Primary" value={primary} onChange={setPrimary} />
                <ColourSwatch label="Secondary / Accent" value={secondary} onChange={setSecondary} />
                <ColourSwatch label="Text" value={textColour} onChange={setTextColour} />
              </div>

              {extraColours.map((c, i) => (
                <div className="extra-colour-row" key={i}>
                  <input
                    className="field-input"
                    placeholder="Role / Label"
                    value={c.label}
                    onChange={e => updateExtraColour(i, "label", e.target.value)}
                  />
                  <div className="colour-input-row" style={{ width: 120 }}>
                    <div className="swatch-wrap" style={{ background: c.hex }}>
                      <input type="color" value={c.hex} onChange={e => updateExtraColour(i, "hex", e.target.value)} className="colour-native" />
                    </div>
                    <input className="hex-input" value={c.hex} onChange={e => updateExtraColour(i, "hex", e.target.value)} maxLength={7} />
                  </div>
                  <button className="btn-ghost-sm" onClick={() => removeExtraColour(i)}>✕</button>
                </div>
              ))}

              <button className="btn-add-colour" onClick={addExtraColour}>+ Add colour</button>
            </div>

            {/* Logo */}
            <div className="vw-section">
              <div className="section-heading">Logo</div>

              <div className="logo-upload-area">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                />
                {logoPreview ? (
                  <div className="logo-preview-wrap">
                    <img src={logoPreview} alt="Logo preview" className="logo-preview-img" />
                    <button
                      className="logo-clear-btn"
                      onClick={(e) => { e.stopPropagation(); clearLogo(); }}
                    >✕</button>
                  </div>
                ) : (
                  <>
                    <div className="logo-upload-icon">🖼</div>
                    <div className="logo-upload-text">
                      <strong>Click to upload</strong> or drag & drop<br />
                      PNG, JPG, SVG, WEBP
                    </div>
                  </>
                )}
              </div>

              <div className="field-wrap">
                <label className="field-label">Logo Description (optional)</label>
                <input
                  className="field-input"
                  placeholder="e.g. White horse with Australian flag, bold sans-serif text"
                  value={logoDescription}
                  onChange={e => setLogoDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Extra Details */}
            <div className="vw-section">
              <div className="section-heading">Extra details</div>
              <textarea
                className="field-input"
                placeholder="Tagline, subsidiary name, special placement notes…"
                value={extraDetails}
                onChange={e => setExtraDetails(e.target.value)}
                style={{ minHeight: 80 }}
              />
            </div>

            {/* Prompt Preview */}
            <div className="vw-section">
              <button className="prompt-toggle" onClick={() => setShowPrompt(!showPrompt)}>
                {showPrompt ? "▾" : "▸"} Prompt preview (sent to n8n)
              </button>
              {showPrompt && <div className="prompt-box">{promptPreview}</div>}
            </div>

          </div>

          {/* ── RIGHT: Generate + Result ── */}
          <div className="vw-right">

            {/* Generate */}
            <div className="vw-section">
              <div className="section-heading">
                Generate
                <StatusPill state={status} />
              </div>

              <button
                className={`btn-generate ${status === "loading" ? "loading" : ""}`}
                onClick={handleGenerate}
                disabled={status === "loading"}
              >
                {status === "loading" ? "⏳ Generating wrap — please wait…" : "⚡ Generate Vinyl Wrap"}
              </button>

              {errorMsg && (
                <div className="error-box">
                  <strong>Generation issue</strong><br />
                  {errorMsg}
                </div>
              )}
            </div>

            {/* Result */}
            <div className="result-panel" ref={resultRef}>
              <div className="result-panel-header">
                <span className="result-panel-title">Mockup Result</span>
                {result?.image_url && (
                  <a
                    href={result.image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost-sm"
                  >
                    Open in Drive ↗
                  </a>
                )}
              </div>
              <div className="result-panel-body">
                {status === "loading" && (
                  <div className="result-skeleton">
                    <div className="skeleton-label">Generating your vinyl wrap…</div>
                  </div>
                )}

                {status === "success" && imageSrc && (
                  <>
                    <img src={imageSrc} alt="Vinyl wrap mockup" className="result-image" />
                    <div className="result-actions">
                      <div className="result-actions-row">
                        <a
                          href={imageSrc}
                          download={`${businessName || "vinyl-wrap"}-mockup.png`}
                          className="btn-action btn-action-primary"
                        >
                          ⬇ Download PNG
                        </a>
                        <button
                          type="button"
                          className="btn-action btn-action-primary"
                          onClick={handleDownloadPdf}
                        >
                          ⬇ Download PDF
                        </button>
                      </div>
                      <div className="result-actions-row">
                        {result?.image_url && (
                          <a
                            href={result.image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-action btn-action-secondary"
                          >
                            ↗ View in Drive
                          </a>
                        )}
                        <button
                          type="button"
                          className="btn-action btn-action-secondary"
                          onClick={() => setShowEditModal(true)}
                          disabled={!currentFileId || regenerating}
                        >
                          {regenerating ? "Regenerating…" : "Edit wrap"}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {(status === "idle" || (status === "error" && !imageSrc)) && (
                  <div className="empty-state">
                    <div className="empty-state-icon">🤖</div>
                    <p>Fill in the client details and colours, then hit Generate</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
      {showEditModal && (
        <div className="edit-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-title">Edit wrap(not working completely yet, if not try Generate again with different prompts)</div>
            <p className="edit-modal-help">
              Describe the changes you want (logo placement, colours, wording, sizing, etc).
            </p>
            <textarea
              className="field-input"
              style={{ minHeight: 120 }}
              value={editInstructions}
              onChange={(e) => setEditInstructions(e.target.value)}
              placeholder="Example: Make logo 20% larger on the front panel, darken primary colour, and move website text to rear panel."
            />
            <div className="edit-modal-actions">
              <button
                type="button"
                className="btn-ghost-sm"
                onClick={() => setShowEditModal(false)}
                disabled={regenerating}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-action btn-action-primary"
                onClick={handleRegenerateWrap}
                disabled={regenerating}
              >
                {regenerating ? "Regenerating…" : "Regenerate wrap"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}