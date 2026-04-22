import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function vinylWrapGeneratorMode(): "deterministic" | "n8n" {
  const m = (process.env.VINYL_WRAP_GENERATOR_MODE || "deterministic").trim().toLowerCase();
  return m === "n8n" ? "n8n" : "deterministic";
}

/**
 * n8n: ACES vinyl robot wrap edit/regenerate flow.
 * Expects file_id + edit_prompt and returns the same shape as generate.
 */
const VINYL_ROBOT_WRAP_REGENERATE_WEBHOOK_URL =
  "https://membersaces.app.n8n.cloud/webhook/vinyl-robot-wrap-regenerate";

const WEBHOOK_TIMEOUT_MS = 300_000;

type IncomingLogo = {
  filename?: unknown;
  mime_type?: unknown;
  base64?: unknown;
};

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

    if (vinylWrapGeneratorMode() !== "n8n") {
      return NextResponse.json(
        {
          success: false,
          error:
            "AI wrap editing is only available when VINYL_WRAP_GENERATOR_MODE=n8n. For the spec board, change colours or logo above and click Generate (or Regenerate spec board on the result panel).",
        },
        { status: 400 }
      );
    }

    const bodyRaw = await req.json();
    const body =
      typeof bodyRaw === "object" && bodyRaw !== null
        ? (bodyRaw as Record<string, unknown>)
        : {};
    const fileId = typeof body?.file_id === "string" ? body.file_id.trim() : "";
    const editPrompt = typeof body?.edit_prompt === "string" ? body.edit_prompt.trim() : "";
    if (!fileId || !editPrompt) {
      return NextResponse.json(
        { error: "file_id and edit_prompt are required." },
        { status: 400 }
      );
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
      event: "vinyl_robot_wrap_regenerate",
      ...restBody,
      file_id: fileId,
      edit_prompt: editPrompt,
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
      webhookRes = await fetch(VINYL_ROBOT_WRAP_REGENERATE_WEBHOOK_URL, {
        method: "POST",
        body: webhookForm,
        signal: controller.signal,
      });
    } catch (e: unknown) {
      clearTimeout(timeout);
      if (e instanceof Error && e.name === "AbortError") {
        return NextResponse.json(
          { error: "Wrap regeneration timed out. Try again or check the n8n workflow." },
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
