"use client";

import { useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ExtraColour {
  label: string;
  hex: string;
}

interface VinylWrapVariant {
  id: string;
  label: string;
  layout_preset?: string;
  effective_wrap_style?: string;
  image_base64?: string;
  image_mime?: string;
  svg_text?: string;
  filename?: string;
}

interface GenerateResult {
  success: boolean;
  image_url?: string;
  image_base64?: string;
  image_mime?: string;
  file_id?: string;
  error?: string;
  svg_text?: string;
  filename?: string;
  wrap_style?: "commercial" | "sports";
  generator_mode?: "deterministic" | "n8n";
  /** Deterministic generator: four layout presets (wings, centre, retail, sports). */
  variants?: VinylWrapVariant[];
}

function buildPreviewDataUrl(image_base64: string | undefined, image_mime: string | undefined): string | null {
  if (!image_base64) return null;
  const raw = image_base64.replace(/^data:image\/[^;]+;base64,/i, "").trim();
  const mime = (image_mime && image_mime.trim()) || "image/png";
  return `data:${mime};base64,${raw}`;
}

function variantChipLabel(id: string): string {
  const m: Record<string, string> = {
    generic: "A · Wings",
    ics: "B · Centre",
    foodworks: "C · Retail",
    sports_showcase: "D · Sports",
  };
  return m[id] ?? id;
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function VinylRobotWrapPage() {
  const params = useSearchParams();

  const [businessName, setBusinessName] = useState(params.get("businessName") ?? "");
  const [tradingAs, setTradingAs] = useState(params.get("tradingAs") ?? "");
  const [contactName, setContactName] = useState(params.get("contactName") ?? "");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [siteAddress, setSiteAddress] = useState(params.get("siteAddress") ?? "");
  const [website, setWebsite] = useState(params.get("website") ?? "");
  const [clientId, setClientId] = useState(params.get("clientId") ?? "");
  const [clientFolderUrl] = useState(params.get("clientFolderUrl") ?? "");

  const [primary, setPrimary] = useState("#1a1a1a");
  const [secondary, setSecondary] = useState("#5750F1");
  const [textColour, setTextColour] = useState("#FFFFFF");
  const [extraColours, setExtraColours] = useState<ExtraColour[]>([]);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoDescription, setLogoDescription] = useState("");
  const [coloursAutoDetected, setColoursAutoDetected] = useState(false);
  const [userEditedColours, setUserEditedColours] = useState(false);

  const [extraDetails, setExtraDetails] = useState("");
  const [showPrompt, setShowPrompt] = useState(false);
  const [memberContextOpen, setMemberContextOpen] = useState(false);

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editInstructions, setEditInstructions] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [showResultLightbox, setShowResultLightbox] = useState(false);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);

  const resultRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "success" && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [status]);

  // ── Colour extraction from logo ──
  // Reads the uploaded logo's pixels, finds dominant colours, and assigns them
  // to Primary/Accent/Text. User can still override anything.
  function rgbToHex(r: number, g: number, b: number): string {
    const h = (n: number) => n.toString(16).padStart(2, "0").toUpperCase();
    return `#${h(r)}${h(g)}${h(b)}`;
  }

  function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h *= 60;
    }
    return [h, s, l];
  }

  async function extractColoursFromImage(dataUrl: string): Promise<{ primary: string; accent: string; text: string } | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          // Downsample for speed
          const MAX = 100;
          const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
          const w = Math.max(1, Math.floor(img.width * ratio));
          const h = Math.max(1, Math.floor(img.height * ratio));

          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) return resolve(null);
          ctx.drawImage(img, 0, 0, w, h);
          const data = ctx.getImageData(0, 0, w, h).data;

          // Bucket colours by reducing precision (16-step), skip transparent / near-white / near-black backgrounds
          const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
            if (a < 200) continue;                                // transparent → background
            if (r > 245 && g > 245 && b > 245) continue;          // pure white → background
            const br = r >> 4, bg = g >> 4, bb = b >> 4;
            const key = `${br}-${bg}-${bb}`;
            const existing = buckets.get(key);
            if (existing) {
              existing.r += r; existing.g += g; existing.b += b; existing.count++;
            } else {
              buckets.set(key, { r, g, b, count: 1 });
            }
          }

          if (buckets.size === 0) return resolve(null);

          // Average each bucket and rank by frequency
          const colours = Array.from(buckets.values())
            .map(b => ({
              r: Math.round(b.r / b.count),
              g: Math.round(b.g / b.count),
              b: Math.round(b.b / b.count),
              count: b.count,
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 12); // top 12 buckets

          // Score each colour by saturation × log(count) — favours vivid, frequent colours
          const scored = colours.map(c => {
            const [h, s, l] = rgbToHsl(c.r, c.g, c.b);
            return {
              ...c,
              h, s, l,
              hex: rgbToHex(c.r, c.g, c.b),
              vividScore: s * Math.log2(c.count + 1),
            };
          });

          // PRIMARY: most vivid colour with reasonable lightness (not too pale, not pure black)
          const primaryCandidates = scored.filter(c => c.l > 0.1 && c.l < 0.7 && c.s > 0.15);
          const primary = primaryCandidates.length
            ? primaryCandidates.sort((a, b) => b.vividScore - a.vividScore)[0]
            : scored.sort((a, b) => b.count - a.count)[0];

          // ACCENT: a different-hue vivid colour (or a complement / brighter version of primary)
          const accentCandidates = scored.filter(c => {
            const hueDiff = Math.abs(c.h - primary.h);
            const hueGap = Math.min(hueDiff, 360 - hueDiff);
            return hueGap > 30 && c.s > 0.2 && c.hex !== primary.hex;
          });
          let accent: { hex: string };
          if (accentCandidates.length) {
            accent = accentCandidates.sort((a, b) => b.vividScore - a.vividScore)[0];
          } else {
            // Fallback: lighten/saturate the primary
            const [hh] = rgbToHsl(primary.r, primary.g, primary.b);
            // Pick a near-complement
            const compH = (hh + 180) % 360;
            // Convert HSL→RGB for the complement at decent saturation/lightness
            const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
              h /= 360;
              const a = s * Math.min(l, 1 - l);
              const f = (n: number) => {
                const k = (n + h * 12) % 12;
                return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
              };
              return [f(0), f(8), f(4)];
            };
            const [ar, ag, ab] = hslToRgb(compH, 0.65, 0.55);
            accent = { hex: rgbToHex(ar, ag, ab) };
          }

          // TEXT: white if primary is dark, dark if primary is light
          const text = primary.l < 0.55 ? "#FFFFFF" : "#1A1A1A";

          resolve({ primary: primary.hex, accent: accent.hex, text });
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setLogoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        setLogoPreview(dataUrl);
        // Only auto-detect if user hasn't manually overridden the swatches yet
        if (!userEditedColours) {
          const detected = await extractColoursFromImage(dataUrl);
          if (detected) {
            setPrimary(detected.primary);
            setSecondary(detected.accent);
            setTextColour(detected.text);
            setColoursAutoDetected(true);
          }
        }
      };
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
        setSelectedVariantIndex(0);
        setStatus("success");
        setGeneratedAt(new Date());
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
      setGeneratedAt(new Date());
      setShowEditModal(false);
      setEditInstructions("");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setRegenerating(false);
    }
  }

  const layoutVariants =
    result?.generator_mode === "deterministic" && Array.isArray(result.variants)
      ? result.variants.filter((v) => v.image_base64)
      : [];
  const activeLayoutVariant =
    layoutVariants.length > 0
      ? layoutVariants[Math.min(selectedVariantIndex, layoutVariants.length - 1)]
      : null;

  const imageSrc =
    (activeLayoutVariant
      ? buildPreviewDataUrl(activeLayoutVariant.image_base64, activeLayoutVariant.image_mime)
      : null) ??
    buildPreviewDataUrl(result?.image_base64, result?.image_mime) ??
    result?.image_url ??
    null;

  const isSvgPreview =
    result?.image_mime === "image/svg+xml" || result?.generator_mode === "deterministic";

  const promptPreview = `Client: ${businessName || "(none)"}
Primary: ${primary} | Secondary: ${secondary} | Text: ${textColour}
${extraColours.length ? "Extra: " + extraColours.map((c) => `${c.label} ${c.hex}`).join(", ") : ""}
Logo: ${logoFile ? logoFile.name : "none"}${logoDescription ? ` — ${logoDescription}` : ""}
${extraDetails ? `Notes: ${extraDetails}` : ""}`.trim();

  const cleanBusinessName = (businessName || "vinyl-wrap").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const downloadName = isSvgPreview
    ? (activeLayoutVariant?.filename ??
      result?.filename ??
      `${cleanBusinessName}-spec-board.svg`)
    : `${cleanBusinessName}-mockup.png`;

  const hasMinimumData = businessName.trim().length > 0;

  async function handleDownloadPdf() {
    if (!imageSrc || isSvgPreview) return;
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
      pdf.save(`${cleanBusinessName}-mockup.pdf`);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Could not download PDF.");
    }
  }

  // Status text shown in sticky bar
  const statusText = (() => {
    if (status === "loading") return "Generating wrap…";
    if (status === "error") return "Generation failed";
    if (status === "success" && generatedAt) {
      return `Generated ${generatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
    if (!hasMinimumData) return "Add a business name to begin";
    return "Ready to generate";
  })();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        :root {
          --bg: transparent;
          --surface: #fafafc;
          --surface2: #f3f3f7;
          --surface-hover: #ededf2;
          --border: #e6e6ec;
          --border-bright: #cfcfd8;
          --accent: #6c63ff;
          --accent-soft: rgba(108,99,255,0.08);
          --accent-strong: #5750e8;
          --text: #14141f;
          --text-2: #4a4a5e;
          --muted: #7a7a90;
          --muted-2: #a8a8b8;
          --success: #16a34a;
          --error: #dc2626;
          --radius-sm: 6px;
          --radius: 10px;
          --radius-lg: 14px;
          --bar-height: 64px;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .vw-page {
          font-family: 'DM Sans', sans-serif;
          color: var(--text);
          /* Bottom padding makes room for the sticky bar so content never hides behind it */
          padding: 32px 0 calc(var(--bar-height) + 32px);
        }

        .vw-container {
          max-width: 880px;
          margin: 0 auto;
          padding: 0 32px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* ── Card ── */
        .vw-card {
          background: #fff;
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 22px 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Collapsible card variant — minimal padding when closed */
        .vw-card-collapsible {
          padding: 0;
          gap: 0;
          overflow: hidden;
        }

        .card-collapse-trigger {
          background: none;
          border: none;
          width: 100%;
          padding: 16px 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          cursor: pointer;
          font-family: inherit;
          color: inherit;
          text-align: left;
          transition: background 0.12s;
        }

        .card-collapse-trigger:hover {
          background: var(--surface);
        }

        .card-collapse-value {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.84rem;
          font-weight: 500;
          letter-spacing: 0;
          text-transform: none;
          color: var(--text);
          margin-left: 14px;
          padding-left: 14px;
          border-left: 1px solid var(--border);
        }

        .card-collapse-chevron {
          color: var(--muted);
          font-size: 0.85rem;
          transition: transform 0.2s ease;
          line-height: 1;
        }

        .card-collapse-chevron.is-open {
          transform: rotate(180deg);
        }

        .card-collapse-body {
          padding: 0 22px 22px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          border-top: 1px solid var(--border);
          padding-top: 18px;
        }

        /* ── Section heading ── */
        .section-heading {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: 'Syne', sans-serif;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--text-2);
        }

        .section-heading-meta {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.7rem;
          font-weight: 400;
          letter-spacing: 0.04em;
          text-transform: none;
          color: var(--muted-2);
          margin-left: auto;
        }

        /* Auto-detected colours badge */
        .auto-detected-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 9px;
          background: var(--accent-soft);
          color: var(--accent-strong);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.68rem;
          font-weight: 500;
          letter-spacing: 0.02em;
          text-transform: none;
          border-radius: 100px;
          border: 1px solid rgba(108,99,255,0.2);
        }

        .auto-detected-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--accent);
          flex-shrink: 0;
        }

        /* Re-detect link */
        .redetect-link {
          background: none;
          border: none;
          color: var(--muted);
          font-size: 0.74rem;
          cursor: pointer;
          padding: 0;
          font-family: 'DM Sans', sans-serif;
          align-self: flex-start;
          transition: color 0.15s;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .redetect-link:hover {
          color: var(--accent);
        }

        /* ── Fields ── */
        .field-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .field-grid-1 {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .field-wrap {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .field-label {
          font-size: 0.66rem;
          font-weight: 500;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: var(--muted);
        }

        .field-input {
          background: #fff;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 9px 12px;
          font-size: 0.86rem;
          color: var(--text);
          font-family: 'DM Sans', sans-serif;
          transition: border-color 0.15s, box-shadow 0.15s;
          outline: none;
          width: 100%;
        }

        .field-input::placeholder { color: var(--muted-2); }
        .field-input:hover { border-color: var(--border-bright); }
        .field-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-soft);
        }

        textarea.field-input {
          resize: vertical;
          min-height: 70px;
          line-height: 1.5;
        }

        /* ── Brand + Logo combined ── */
        .brand-logo-row {
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: 20px;
          align-items: stretch;
        }

        .brand-side, .logo-side {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .colour-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
        }

        .colour-field {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .colour-input-row {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fff;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 5px 9px;
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .colour-input-row:hover { border-color: var(--border-bright); }
        .colour-input-row:focus-within {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-soft);
        }

        .swatch-wrap {
          width: 26px;
          height: 26px;
          border-radius: 5px;
          cursor: pointer;
          flex-shrink: 0;
          position: relative;
          overflow: hidden;
          box-shadow: inset 0 0 0 1px rgba(0,0,0,0.08);
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
          font-size: 0.78rem;
          color: var(--text-2);
          font-family: 'JetBrains Mono', monospace;
          width: 100%;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }

        .extra-colour-row {
          display: grid;
          grid-template-columns: 1fr 130px auto;
          gap: 8px;
          align-items: center;
        }

        .btn-ghost-sm {
          background: #fff;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--muted);
          font-size: 0.74rem;
          padding: 6px 10px;
          cursor: pointer;
          transition: all 0.15s;
          font-family: 'DM Sans', sans-serif;
        }

        .btn-ghost-sm:hover {
          border-color: var(--border-bright);
          color: var(--text);
          background: var(--surface2);
        }

        .btn-add-colour {
          background: none;
          border: 1px dashed var(--border-bright);
          border-radius: var(--radius-sm);
          color: var(--muted);
          font-size: 0.78rem;
          font-weight: 500;
          padding: 7px 12px;
          cursor: pointer;
          transition: all 0.15s;
          font-family: 'DM Sans', sans-serif;
          align-self: flex-start;
        }

        .btn-add-colour:hover {
          border-color: var(--accent);
          color: var(--accent);
          background: var(--accent-soft);
        }

        /* ── Logo upload ── */
        .logo-upload-area {
          border: 1px dashed var(--border-bright);
          border-radius: var(--radius);
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s;
          background: var(--surface2);
          position: relative;
          flex: 1;
          justify-content: center;
          min-height: 110px;
        }

        .logo-upload-area:hover {
          border-color: var(--accent);
          background: var(--accent-soft);
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
          max-width: 220px;
          object-fit: contain;
          border-radius: 4px;
        }

        .logo-clear-btn {
          position: absolute;
          top: -8px;
          right: -8px;
          background: var(--error);
          border: 2px solid #fff;
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
          line-height: 1;
        }

        .logo-upload-icon {
          font-size: 1.25rem;
          opacity: 0.4;
        }

        .logo-upload-text {
          font-size: 0.78rem;
          color: var(--muted);
          text-align: center;
          line-height: 1.5;
        }

        .logo-upload-text strong {
          color: var(--accent);
          font-weight: 600;
        }

        .logo-upload-text-sub {
          font-size: 0.7rem;
          color: var(--muted-2);
          margin-top: 2px;
        }

        /* ── Prompt preview ── */
        .prompt-toggle {
          background: none;
          border: none;
          color: var(--muted);
          font-size: 0.76rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0;
          font-family: 'DM Sans', sans-serif;
          transition: color 0.15s;
          align-self: flex-start;
        }

        .prompt-toggle:hover { color: var(--text); }

        .prompt-box {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 10px 12px;
          font-size: 0.7rem;
          color: var(--muted);
          line-height: 1.6;
          font-family: 'JetBrains Mono', monospace;
          white-space: pre-wrap;
          max-height: 140px;
          overflow-y: auto;
          margin-top: 8px;
        }

        /* ── Result panel ── */
        .result-panel {
          background: #fff;
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }

        .result-panel-header {
          padding: 12px 18px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background: var(--surface);
        }

        .variant-picker {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 10px 14px 12px;
          border-bottom: 1px solid var(--border);
          background: var(--surface2);
        }

        .variant-picker-hint {
          width: 100%;
          font-size: 0.72rem;
          color: var(--muted);
          line-height: 1.35;
          margin: 0 0 2px 0;
        }

        .variant-chip {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.72rem;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: #fff;
          color: var(--text);
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }

        .variant-chip:hover {
          border-color: var(--accent);
          background: var(--surface-hover);
        }

        .variant-chip-active {
          border-color: var(--accent);
          background: rgba(108, 99, 255, 0.1);
          color: var(--accent);
        }

        .result-panel-header-left {
          display: flex;
          align-items: baseline;
          gap: 12px;
          min-width: 0;
        }

        .result-panel-title {
          font-family: 'Syne', sans-serif;
          font-size: 0.76rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text);
        }

        .result-panel-sub {
          font-size: 0.7rem;
          color: var(--muted);
          font-family: 'JetBrains Mono', monospace;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .result-panel-body {
          padding: 14px;
        }

        .result-skeleton {
          width: 100%;
          aspect-ratio: 16/11;
          background: linear-gradient(
            90deg,
            var(--surface2) 0%,
            var(--surface-hover) 50%,
            var(--surface2) 100%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: var(--radius);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .skeleton-label {
          font-size: 0.78rem;
          color: var(--muted);
          font-weight: 500;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }

        .result-image-wrap {
          position: relative;
          cursor: zoom-in;
          border-radius: var(--radius);
          overflow: hidden;
          box-shadow: inset 0 0 0 1px var(--border);
        }

        .result-image {
          width: 100%;
          display: block;
          background: #fff;
        }

        .result-image-wrap:hover::after {
          content: '⤢ Click to expand';
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(20,20,31,0.78);
          color: #fff;
          padding: 4px 9px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 500;
          backdrop-filter: blur(4px);
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px 24px;
          gap: 10px;
          color: var(--muted);
          text-align: center;
          background: var(--surface);
          border: 1px dashed var(--border);
          border-radius: var(--radius);
          aspect-ratio: 16/8;
        }

        .empty-state-icon {
          font-size: 1.8rem;
          opacity: 0.3;
        }

        .empty-state p {
          font-size: 0.84rem;
          line-height: 1.5;
          color: var(--text-2);
          font-weight: 500;
        }

        .empty-state-hint {
          font-size: 0.74rem;
          color: var(--muted);
          font-weight: 400;
        }

        /* ──────────────────────────────────────────
           STICKY BOTTOM BAR — the headline change
           ────────────────────────────────────────── */
        .vw-sticky-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 100;
          height: var(--bar-height);
          background: rgba(255,255,255,0.94);
          backdrop-filter: blur(14px) saturate(180%);
          border-top: 1px solid var(--border);
          box-shadow: 0 -4px 20px rgba(20,20,31,0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 32px;
        }

        .vw-sticky-bar-inner {
          width: 100%;
          max-width: 880px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .sticky-status {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .sticky-status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .indicator-idle { background: var(--muted-2); }
        .indicator-loading { background: var(--accent); animation: pulse 1.2s infinite; }
        .indicator-success { background: var(--success); }
        .indicator-error { background: var(--error); }

        .sticky-status-text {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
        }

        .sticky-status-line1 {
          font-size: 0.84rem;
          font-weight: 500;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sticky-status-line2 {
          font-size: 0.7rem;
          color: var(--muted);
          font-family: 'JetBrains Mono', monospace;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sticky-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .btn-sticky-secondary {
          padding: 9px 14px;
          background: #fff;
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-2);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.82rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          text-decoration: none;
        }

        .btn-sticky-secondary:hover {
          border-color: var(--border-bright);
          background: var(--surface2);
          color: var(--text);
        }

        .btn-sticky-primary {
          padding: 10px 22px;
          background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
          border: none;
          border-radius: 8px;
          color: #fff;
          font-family: 'Syne', sans-serif;
          font-size: 0.86rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          cursor: pointer;
          transition: all 0.15s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
          box-shadow: 0 2px 10px rgba(108,99,255,0.3);
        }

        .btn-sticky-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(108,99,255,0.4);
        }

        .btn-sticky-primary:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          background: var(--muted);
          box-shadow: none;
        }

        .btn-spinner {
          display: inline-block;
          width: 12px;
          height: 12px;
          border: 2px solid currentColor;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        /* Error box */
        .error-box {
          background: rgba(220,38,38,0.05);
          border: 1px solid rgba(220,38,38,0.18);
          border-left: 3px solid var(--error);
          border-radius: var(--radius-sm);
          padding: 10px 12px;
          font-size: 0.78rem;
          color: var(--error);
          line-height: 1.5;
        }

        .error-box strong {
          display: block;
          font-weight: 600;
          margin-bottom: 2px;
        }

        /* Lightbox */
        .lightbox-overlay {
          position: fixed;
          inset: 0;
          background: rgba(20,20,31,0.85);
          backdrop-filter: blur(6px);
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px;
          cursor: zoom-out;
          animation: fadeIn 0.15s ease;
        }

        .lightbox-image {
          max-width: 100%;
          max-height: 100%;
          border-radius: var(--radius);
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        }

        .lightbox-close {
          position: absolute;
          top: 20px;
          right: 24px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.2);
          color: #fff;
          font-size: 1.2rem;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .lightbox-close:hover { background: rgba(255,255,255,0.2); }

        /* Edit modal */
        .edit-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(20, 20, 31, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 220;
          padding: 20px;
          animation: fadeIn 0.15s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .edit-modal {
          width: min(580px, 100%);
          background: #fff;
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
          padding: 22px;
        }

        .edit-modal-title {
          font-family: 'Syne', sans-serif;
          font-size: 1.05rem;
          font-weight: 700;
          margin-bottom: 6px;
          color: var(--text);
        }

        .edit-modal-help {
          color: var(--muted);
          font-size: 0.82rem;
          margin-bottom: 14px;
          line-height: 1.5;
        }

        .edit-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 14px;
        }

        /* Responsive */
        @media (max-width: 820px) {
          .vw-page { padding: 20px 0 calc(var(--bar-height) + 20px); }
          .vw-container { padding: 0 18px; }
          .vw-card { padding: 18px; }
          .field-grid { grid-template-columns: 1fr 1fr; }
          .brand-logo-row { grid-template-columns: 1fr; }
          .colour-grid { grid-template-columns: 1fr 1fr; }
          .vw-sticky-bar { padding: 0 18px; }
          .sticky-status-line2 { display: none; }
        }

        @media (max-width: 540px) {
          .field-grid { grid-template-columns: 1fr; }
          .colour-grid { grid-template-columns: 1fr; }
          .btn-sticky-secondary { display: none; }
        }
      `}</style>

      <div className="vw-page">
        <div className="vw-container">

          {errorMsg && (
            <div className="error-box">
              <strong>Generation issue</strong>
              {errorMsg}
            </div>
          )}

          {/* ── MEMBER CONTEXT (collapsible) ── */}
          <div className="vw-card vw-card-collapsible">
            <button
              type="button"
              className="card-collapse-trigger"
              onClick={() => setMemberContextOpen(!memberContextOpen)}
              aria-expanded={memberContextOpen}
            >
              <span className="section-heading">
                Member context
                {businessName && (
                  <span className="card-collapse-value">{businessName}</span>
                )}
              </span>
              <span className={`card-collapse-chevron ${memberContextOpen ? "is-open" : ""}`}>▾</span>
            </button>

            {memberContextOpen && (
              <div className="card-collapse-body">
                <div className="field-grid">
                  <div className="field-wrap">
                    <label className="field-label">Business Name</label>
                    <input className="field-input" value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="e.g. Frankston RSL Sub Branch Inc" />
                  </div>
                  <div className="field-wrap">
                    <label className="field-label">Trading As</label>
                    <input className="field-input" value={tradingAs} onChange={e => setTradingAs(e.target.value)} placeholder="e.g. Frankston RSL" />
                  </div>
                  <div className="field-wrap">
                    <label className="field-label">CRM Client ID</label>
                    <input className="field-input" value={clientId} onChange={e => setClientId(e.target.value)} />
                  </div>
                  <div className="field-wrap">
                    <label className="field-label">Contact Name</label>
                    <input className="field-input" value={contactName} onChange={e => setContactName(e.target.value)} />
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
                <div className="field-grid-1">
                  <div className="field-wrap">
                    <label className="field-label">Site Address</label>
                    <input className="field-input" value={siteAddress} onChange={e => setSiteAddress(e.target.value)} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── BRAND + LOGO COMBINED ── */}
          <div className="vw-card">
            <div className="brand-logo-row">
              <div className="brand-side">
                <div className="section-heading">
                  Brand colours
                  {coloursAutoDetected && !userEditedColours && (
                    <span className="auto-detected-badge" title="Colours detected from your logo. Edit any swatch to override.">
                      <span className="auto-detected-dot" />
                      Detected from logo
                    </span>
                  )}
                  <span className="section-heading-meta">{3 + extraColours.filter(c => c.label && c.hex).length} active</span>
                </div>
                <div className="colour-grid">
                  <ColourSwatch label="Primary" value={primary} onChange={(v) => { setPrimary(v); setUserEditedColours(true); setColoursAutoDetected(false); }} />
                  <ColourSwatch label="Accent" value={secondary} onChange={(v) => { setSecondary(v); setUserEditedColours(true); setColoursAutoDetected(false); }} />
                  <ColourSwatch label="Text" value={textColour} onChange={(v) => { setTextColour(v); setUserEditedColours(true); setColoursAutoDetected(false); }} />
                </div>

                {logoPreview && (
                  <button
                    type="button"
                    className="redetect-link"
                    onClick={async () => {
                      const detected = await extractColoursFromImage(logoPreview);
                      if (detected) {
                        setPrimary(detected.primary);
                        setSecondary(detected.accent);
                        setTextColour(detected.text);
                        setColoursAutoDetected(true);
                        setUserEditedColours(false);
                      }
                    }}
                  >
                    ↻ Re-detect colours from logo
                  </button>
                )}

                {extraColours.map((c, i) => (
                  <div className="extra-colour-row" key={i}>
                    <input
                      className="field-input"
                      placeholder="Role / label"
                      value={c.label}
                      onChange={e => updateExtraColour(i, "label", e.target.value)}
                    />
                    <div className="colour-input-row">
                      <div className="swatch-wrap" style={{ background: c.hex }}>
                        <input type="color" value={c.hex} onChange={e => updateExtraColour(i, "hex", e.target.value)} className="colour-native" />
                      </div>
                      <input className="hex-input" value={c.hex} onChange={e => updateExtraColour(i, "hex", e.target.value)} maxLength={7} />
                    </div>
                    <button className="btn-ghost-sm" onClick={() => removeExtraColour(i)} aria-label="Remove">✕</button>
                  </div>
                ))}

                <button className="btn-add-colour" onClick={addExtraColour}>+ Add colour</button>
              </div>

              <div className="logo-side">
                <div className="section-heading">
                  Logo
                  {logoFile && <span className="section-heading-meta">{logoFile.name.length > 18 ? logoFile.name.slice(0, 16) + '…' : logoFile.name}</span>}
                </div>
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
                        aria-label="Clear logo"
                      >✕</button>
                    </div>
                  ) : (
                    <>
                      <div className="logo-upload-icon">↑</div>
                      <div className="logo-upload-text">
                        <strong>Upload logo</strong>
                        <div className="logo-upload-text-sub">PNG · JPG · SVG · WEBP</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="field-grid-1">
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
          </div>

          {/* ── RESULT (lives in the page, doesn't push the bar around) ── */}
          <div className="result-panel" ref={resultRef}>
            <div className="result-panel-header">
              <div className="result-panel-header-left">
                <span className="result-panel-title">{isSvgPreview ? "Spec Board" : "Mockup"}</span>
                {result && <span className="result-panel-sub">{downloadName}</span>}
              </div>
            </div>
            {status === "success" && layoutVariants.length > 1 && (
              <div className="variant-picker" role="tablist" aria-label="Layout options">
                <p className="variant-picker-hint">
                  Four print layouts are generated — pick the one closest to how you want the wrap to read (wings vs
                  centre brand vs retail rear vs sports).
                </p>
                {layoutVariants.map((v, idx) => (
                  <button
                    key={v.id || idx}
                    type="button"
                    role="tab"
                    aria-selected={idx === Math.min(selectedVariantIndex, layoutVariants.length - 1)}
                    className={`variant-chip ${idx === Math.min(selectedVariantIndex, layoutVariants.length - 1) ? "variant-chip-active" : ""}`}
                    title={v.label}
                    onClick={() => setSelectedVariantIndex(idx)}
                  >
                    {variantChipLabel(v.id)}
                  </button>
                ))}
              </div>
            )}
            <div className="result-panel-body">
              {status === "loading" && (
                <div className="result-skeleton">
                  <div className="skeleton-label">Generating your wrap…</div>
                </div>
              )}

              {status === "success" && imageSrc && (
                <div className="result-image-wrap" onClick={() => setShowResultLightbox(true)}>
                  <img src={imageSrc} alt={isSvgPreview ? "Vinyl wrap specification board" : "Vinyl wrap mockup"} className="result-image" />
                </div>
              )}

              {(status === "idle" || (status === "error" && !imageSrc)) && (
                <div className="empty-state">
                  <div className="empty-state-icon">◇</div>
                  <p>Your mockup will appear here</p>
                  <div className="empty-state-hint">Hit Generate at the bottom of the screen ↓</div>
                </div>
              )}
            </div>
          </div>

          {/* Payload preview (subtle, collapsed by default) */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="prompt-toggle" onClick={() => setShowPrompt(!showPrompt)}>
              {showPrompt ? "▾" : "▸"} Payload preview
            </button>
          </div>
          {showPrompt && <div className="prompt-box" style={{ marginTop: 0 }}>{promptPreview}</div>}

        </div>

        {/* ───── STICKY BOTTOM BAR ───── */}
        <div className="vw-sticky-bar">
          <div className="vw-sticky-bar-inner">
            <div className="sticky-status">
              <div className={`sticky-status-indicator indicator-${status === "loading" ? "loading" : status === "success" ? "success" : status === "error" ? "error" : "idle"}`} />
              <div className="sticky-status-text">
                <div className="sticky-status-line1">{statusText}</div>
                {result && (
                  <div className="sticky-status-line2">{downloadName}</div>
                )}
              </div>
            </div>

            <div className="sticky-actions">
              {result && imageSrc && (
                <>
                  <a
                    href={imageSrc}
                    download={downloadName}
                    className="btn-sticky-secondary"
                  >
                    ↓ Download
                  </a>
                  {!isSvgPreview && (
                    <button
                      type="button"
                      className="btn-sticky-secondary"
                      onClick={() => setShowEditModal(true)}
                      disabled={!currentFileId || regenerating}
                    >
                      ✎ Edit
                    </button>
                  )}
                </>
              )}
              <button
                className="btn-sticky-primary"
                onClick={handleGenerate}
                disabled={status === "loading" || !hasMinimumData}
              >
                {status === "loading" ? (
                  <><span className="btn-spinner" /> Generating</>
                ) : (
                  <>{result ? "Regenerate" : "Generate"} →</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {showResultLightbox && imageSrc && (
        <div className="lightbox-overlay" onClick={() => setShowResultLightbox(false)}>
          <button className="lightbox-close" onClick={() => setShowResultLightbox(false)} aria-label="Close">✕</button>
          <img src={imageSrc} alt="Vinyl wrap full preview" className="lightbox-image" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* Edit modal */}
      {showEditModal && (
        <div className="edit-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-title">Edit wrap</div>
            <p className="edit-modal-help">
              Describe the changes you want — logo placement, colours, wording, sizing. <em>Note: edit mode is experimental; if it doesn't work, regenerate from scratch.</em>
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
                className="btn-sticky-primary"
                onClick={handleRegenerateWrap}
                disabled={regenerating}
                style={{ flex: "0 0 auto", padding: "9px 18px" }}
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