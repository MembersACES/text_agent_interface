import { after, NextRequest, NextResponse } from "next/server";

const N8N_WEBHOOK_URL =
  process.env.N8N_BASE1_WEBHOOK_URL ||
  "https://membersaces.app.n8n.cloud/webhook/interface_form_base1_dev";

/** Background forward to n8n (workflow often takes 2–25+ minutes). */
const N8N_FORWARD_TIMEOUT_MS = 25 * 60 * 1000;

/**
 * Proxy POST to n8n Base 1 webhook.
 * - Avoids CORS (browser calls same origin; server calls n8n).
 * - Returns immediately: n8n Cloud cuts synchronous webhook responses at ~60s
 *   (Cloudflare), while Base 1 runs ~2+ minutes. The workflow still completes;
 *   we must not block the browser on the Respond to Webhook node.
 */
export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Content-Type must be multipart/form-data" },
      { status: 400 }
    );
  }

  let body: ArrayBuffer;
  try {
    body = await req.arrayBuffer();
  } catch (e) {
    console.error("[base1-submit] Failed to read body:", e);
    return NextResponse.json(
      { error: "Failed to read request body" },
      { status: 400 }
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), N8N_FORWARD_TIMEOUT_MS);
  const forwardPromise = fetch(N8N_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": contentType },
    body,
    signal: controller.signal,
  });

  after(async () => {
    try {
      const res = await forwardPromise;
      const responseBody = await res.text();
      if (!res.ok) {
        console.error(
          "[base1-submit:bg] n8n non-OK:",
          res.status,
          responseBody?.slice(0, 500)
        );
      } else {
        console.log("[base1-submit:bg] n8n completed", { status: res.status });
      }
    } catch (err: unknown) {
      const isTimeout = err instanceof Error && err.name === "AbortError";
      console.error("[base1-submit:bg] n8n forward error:", isTimeout ? "timeout" : err);
    } finally {
      clearTimeout(timeoutId);
    }
  });

  return NextResponse.json(
    {
      accepted: true,
      async: true,
      code: "ACCEPTED_FOR_PROCESSING",
      message:
        "Your submission was received and is being processed. Base 1 review typically takes 2–10 minutes—check the Lead Pipeline below and your email for the completed review.",
    },
    { status: 200 }
  );
}
