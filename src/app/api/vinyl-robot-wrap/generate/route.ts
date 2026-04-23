import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/utils";

/**
 * deterministic (default): FastAPI POST /api/vinyl-wrap/generate — SVG spec board.
 * n8n: legacy webhook (ACES vinyl robot wrap — 4-panel mockup).
 */
function vinylWrapGeneratorMode(): "deterministic" | "n8n" {
  const m = (process.env.VINYL_WRAP_GENERATOR_MODE || "deterministic").trim().toLowerCase();
  return m === "n8n" ? "n8n" : "deterministic";
}

const VINYL_ROBOT_WRAP_WEBHOOK_URL =
  "https://membersaces.app.n8n.cloud/webhook/vinyl-robot-wrap-generation";

const WEBHOOK_TIMEOUT_MS = 300_000;

type IncomingLogo = {
  filename?: unknown;
  mime_type?: unknown;
  base64?: unknown;
};

const VINYL_WRAP_SYSTEM_INSTRUCTIONS = `You are a professional vinyl wrap designer for the PUDU CC1 commercial cleaning robot.

When given a client logo and brand colours, generate a photorealistic vinyl wrap mockup composite image with exactly 4 panels on a clean white background in a 2x2 grid layout:

TOP-LEFT: Flat die-cut template — FRONT SHELL wrap panel
- Exact shape as shown in the PUDU CC1 spec sheet (Image 3)
- Filled solid with the client's PRIMARY brand colour
- Client logo centred on the shape

TOP-RIGHT: Flat die-cut template — BACK SHELL wrap panel
- Exact shape as shown in the PUDU CC1 spec sheet (Image 3)
- Filled solid with the client's PRIMARY brand colour
- Client logo centred on the shape

BOTTOM-LEFT: Photorealistic 3D render — FRONT angled view of the PUDU CC1 robot with wrap applied
- Client logo visible on front face
- Clean studio lighting, white background, soft shadow beneath

BOTTOM-RIGHT: Photorealistic 3D render — BACK angled view of the PUDU CC1 robot with wrap applied
- Client logo on rear face
- Same studio lighting, white background

Style: Professional commercial print mockup. Crisp flat die-cut template edges matching the spec sheet exactly. Photorealistic 3D robot renders. Balanced 2x2 grid layout. White background throughout.`;

function unwrapN8nBody(raw: unknown): Record<string, unknown> {
  let o: Record<string, unknown>;
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object" && raw[0] !== null) {
    o = { ...(raw[0] as Record<string, unknown>) };
  } else if (typeof raw === "object" && raw !== null) {
    o = { ...(raw as Record<string, unknown>) };
  } else {
    return {};
  }
  if (typeof o.data === "object" && o.data !== null && !Array.isArray(o.data)) {
    o = { ...o, ...(o.data as Record<string, unknown>) };
  }
  return o;
}

function extractDriveFileIdFromUrl(url: string): string | undefined {
  const m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  return m?.[1];
}

function normalizeResponse(obj: Record<string, unknown>) {
  const pick = (...keys: string[]): string | undefined => {
    for (const k of keys) {
      const v = obj[k];
      if (v != null && String(v).trim() !== "") return String(v);
    }
    return undefined;
  };

  const image_url = pick(
    "image_url",
    "mockup_url",
    "result_url",
    "output_url",
    "imageUrl",
    "mockupUrl",
    "url"
  );
  const image_base64 = pick("image_base64", "imageBase64", "base64", "output_base64");
  let file_id = pick("file_id", "image_file_id", "imageFileId", "drive_file_id", "driveFileId");
  if (!file_id && image_url) {
    file_id = extractDriveFileIdFromUrl(image_url);
  }

  const explicitFail =
    obj.success === false || (typeof obj.error === "string" && obj.error.trim().length > 0);
  const hasOutput = Boolean(image_url || image_base64);

  return {
    success: !explicitFail && hasOutput,
    image_url,
    image_base64,
    file_id,
    error: typeof obj.error === "string" ? obj.error : undefined,
  };
}

function stripDataUrlBase64(b64: string): string {
  return b64.trim().replace(/^data:[^;]+;base64,/i, "");
}

/** Display name for spec board: trading-as if set, else legal business name. */
function resolveClientNameForSpec(client: Record<string, unknown> | undefined): string {
  const trading =
    client && typeof client.trading_as === "string" ? client.trading_as.trim() : "";
  const legal = client && typeof client.name === "string" ? client.name.trim() : "";
  return trading || legal;
}

async function postDeterministicVinylWrap(req: NextRequest, body: Record<string, unknown>, session: Session) {
  const client = typeof body.client === "object" && body.client !== null ? (body.client as Record<string, unknown>) : undefined;
  const brand =
    typeof body.brand === "object" && body.brand !== null ? (body.brand as Record<string, unknown>) : undefined;

  const client_name = resolveClientNameForSpec(client);
  if (!client_name) {
    return NextResponse.json(
      { success: false, error: "client.name or client.trading_as is required for spec board generation." },
      { status: 400 }
    );
  }

  const primary = typeof brand?.primary_colour === "string" ? brand.primary_colour.trim() : "";
  const secondary = typeof brand?.secondary_colour === "string" ? brand.secondary_colour.trim() : "";
  const textC = typeof brand?.text_colour === "string" ? brand.text_colour.trim() : "";
  if (!primary || !secondary || !textC) {
    return NextResponse.json(
      { success: false, error: "brand.primary_colour, secondary_colour, and text_colour are required." },
      { status: 400 }
    );
  }

  const extraColours = Array.isArray(brand?.extra_colours) ? brand?.extra_colours : [];
  const extra_details = typeof body.extra_details === "string" ? body.extra_details : "";
  const wrapStyleRaw =
    brand && typeof (brand as { wrap_style?: unknown }).wrap_style === "string"
      ? String((brand as { wrap_style: string }).wrap_style).trim().toLowerCase()
      : "";
  const wrap_style = wrapStyleRaw === "sports" ? "sports" : "commercial";

  const logo = (body.logo ?? null) as IncomingLogo | null;
  const logoFilename =
    logo && typeof logo.filename === "string" && logo.filename.trim()
      ? logo.filename.trim()
      : "logo.png";
  const logoMimeType =
    logo && typeof logo.mime_type === "string" && logo.mime_type.trim()
      ? logo.mime_type.trim()
      : "application/octet-stream";
  const logoBase64Raw =
    logo && typeof logo.base64 === "string" && logo.base64.trim()
      ? stripDataUrlBase64(logo.base64)
      : "";
  const logoBase64 = logoBase64Raw.trim();

  const requestHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const backendUrl = getApiBaseUrl(requestHost);
  const token = (session as { id_token?: string; accessToken?: string })?.id_token ||
    (session as { accessToken?: string })?.accessToken;
  const apiKey = process.env.BACKEND_API_KEY || "test-key";
  const authToken =
    token && token !== "undefined" && typeof token === "string" ? token : apiKey;

  const form = new FormData();
  form.append("client_name", client_name);
  form.append("primary_colour", primary);
  form.append("secondary_colour", secondary);
  form.append("text_colour", textC);
  form.append("extra_colours_json", JSON.stringify(extraColours));
  form.append("extra_details", extra_details);
  form.append("wrap_style", wrap_style);

  if (logoBase64.length > 0) {
    const logoBytes = Buffer.from(logoBase64, "base64");
    const logoBlob = new Blob([logoBytes], { type: logoMimeType });
    form.append("logo_file", logoBlob, logoFilename);
  }

  const res = await fetch(`${backendUrl}/api/vinyl-wrap/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    body: form,
  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const detail =
      (typeof data.detail === "string" ? data.detail : null) ||
      (typeof data.error === "string" ? data.error : null) ||
      "Vinyl wrap generation failed";
    return NextResponse.json({ success: false, error: detail }, { status: res.status });
  }

  const image_base64 =
    typeof data.image_base64 === "string" ? stripDataUrlBase64(data.image_base64) : undefined;
  const image_mime = typeof data.image_mime === "string" ? data.image_mime : "image/svg+xml";
  const svg_text = typeof data.svg_text === "string" ? data.svg_text : undefined;
  const filename = typeof data.filename === "string" ? data.filename : undefined;

  if (!image_base64) {
    return NextResponse.json(
      { success: false, error: "Backend did not return image_base64." },
      { status: 502 }
    );
  }

  const variants = Array.isArray(data.variants)
    ? (data.variants as Record<string, unknown>[]).map((v) => ({
        id: typeof v.id === "string" ? v.id : "",
        label: typeof v.label === "string" ? v.label : "",
        layout_preset: typeof v.layout_preset === "string" ? v.layout_preset : undefined,
        effective_wrap_style:
          typeof v.effective_wrap_style === "string" ? v.effective_wrap_style : undefined,
        image_base64:
          typeof v.image_base64 === "string" ? stripDataUrlBase64(v.image_base64) : undefined,
        image_mime: typeof v.image_mime === "string" ? v.image_mime : "image/svg+xml",
        svg_text: typeof v.svg_text === "string" ? v.svg_text : undefined,
        filename: typeof v.filename === "string" ? v.filename : undefined,
      }))
    : undefined;

  return NextResponse.json({
    success: true,
    image_base64,
    image_mime,
    svg_text,
    filename,
    wrap_style,
    generator_mode: "deterministic" as const,
    variants,
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bodyRaw = await req.json();
    const body =
      typeof bodyRaw === "object" && bodyRaw !== null
        ? (bodyRaw as Record<string, unknown>)
        : {};

    if (vinylWrapGeneratorMode() === "deterministic") {
      return postDeterministicVinylWrap(req, body, session);
    }

    const logo = (body.logo ?? null) as IncomingLogo | null;
    const { logo: _ignoredLogo, ...restBody } = body;

    const logoFilename =
      logo && typeof logo.filename === "string" && logo.filename.trim()
        ? logo.filename.trim()
        : "logo.png";
    const logoMimeType =
      logo && typeof logo.mime_type === "string" && logo.mime_type.trim()
        ? logo.mime_type.trim()
        : "application/octet-stream";
    const logoBase64 =
      logo && typeof logo.base64 === "string" && logo.base64.trim()
        ? logo.base64.trim().replace(/^data:.*;base64,/, "")
        : "";

    const payload = {
      event: "vinyl_robot_wrap_generate",
      design_system_instructions: VINYL_WRAP_SYSTEM_INSTRUCTIONS,
      ...restBody,
      logo:
        logoBase64.length > 0
          ? {
              filename: logoFilename,
              mime_type: logoMimeType,
            }
          : undefined,
      requested_by: (session.user as { email?: string })?.email ?? null,
      requested_at: new Date().toISOString(),
    };

    const webhookForm = new FormData();
    webhookForm.append("payload", JSON.stringify(payload));
    if (logoBase64.length > 0) {
      const logoBytes = Buffer.from(logoBase64, "base64");
      const logoBlob = new Blob([logoBytes], { type: logoMimeType });
      webhookForm.append("logo_file", logoBlob, logoFilename);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

    let webhookRes: Response;
    try {
      webhookRes = await fetch(VINYL_ROBOT_WRAP_WEBHOOK_URL, {
        method: "POST",
        body: webhookForm,
        signal: controller.signal,
      });
    } catch (e: unknown) {
      clearTimeout(timeout);
      if (e instanceof Error && e.name === "AbortError") {
        return NextResponse.json(
          { error: "Vinyl wrap generation timed out. Try again or check the n8n workflow." },
          { status: 504 }
        );
      }
      throw e;
    } finally {
      clearTimeout(timeout);
    }

    const responseText = await webhookRes.text();
    let parsed: unknown = null;
    try {
      parsed = responseText ? JSON.parse(responseText) : null;
    } catch {
      return NextResponse.json(
        { error: `n8n returned non-JSON (${webhookRes.status}): ${responseText.slice(0, 500)}` },
        { status: 502 }
      );
    }

    const obj = unwrapN8nBody(parsed);
    const normalized = normalizeResponse(obj);

    if (!webhookRes.ok) {
      const msg =
        normalized.error ||
        (typeof obj.message === "string" ? obj.message : null) ||
        responseText.slice(0, 300) ||
        `Webhook failed (${webhookRes.status})`;
      return NextResponse.json({ error: msg, success: false }, { status: 502 });
    }

    if (!normalized.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            normalized.error ||
            "n8n did not return image_url or image_base64. Check the workflow response shape.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      image_url: normalized.image_url,
      image_base64: normalized.image_base64,
      file_id: normalized.file_id,
      generator_mode: "n8n" as const,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
