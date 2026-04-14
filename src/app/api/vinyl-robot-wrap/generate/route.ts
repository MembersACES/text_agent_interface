import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * n8n: ACES vinyl robot wrap — 4-panel mockup generation.
 * Update this webhook URL if the workflow path changes.
 */
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
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
