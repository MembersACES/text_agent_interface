import { NextRequest, NextResponse } from "next/server";

const N8N_WEBHOOK_URL =
  process.env.N8N_BASE1_WEBHOOK_URL ||
  "https://membersaces.app.n8n.cloud/webhook/interface_form_base1_dev";

/** Server-side timeout for n8n (workflow can take 10–25+ minutes). */
const PROXY_TIMEOUT_MS = 25 * 60 * 1000; // 25 minutes

/**
 * Proxy POST to n8n Base 1 webhook.
 * - Avoids CORS (browser calls same origin; server calls n8n).
 * - Uses long server timeout so n8n can finish before proxy times out.
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
  const timeoutId = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

  try {
    const res = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": contentType,
      },
      body,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const responseContentType = res.headers.get("content-type") || "application/json";
    const responseBody = await res.text();

    if (!res.ok) {
      console.error(
        "[base1-submit] n8n non-OK:",
        res.status,
        responseBody?.slice(0, 500)
      );
      // 524 (Cloudflare) / 504 = upstream timeout — n8n often still completes;
      // treat as accepted so the UI can show a success/\"processing\" state.
      if (res.status === 524 || res.status === 504) {
        return NextResponse.json(
          {
            accepted: true,
            code: "UPSTREAM_TIMEOUT",
            message:
              "The request timed out before we could show the result, but your submission was received. Check the Base 1 pipeline and your email for the completed review.",
          },
          { status: 200 }
        );
      }
      return new NextResponse(responseBody, {
        status: res.status,
        statusText: res.statusText,
        headers: { "Content-Type": responseContentType },
      });
    }

    return new NextResponse(responseBody, {
      status: res.status,
      headers: { "Content-Type": responseContentType },
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const isTimeout = err instanceof Error && err.name === "AbortError";
    console.error("[base1-submit] Proxy error:", isTimeout ? "timeout" : err);
    return NextResponse.json(
      {
        error: isTimeout
          ? "Request to n8n timed out. Your submission may still have been received."
          : "Failed to reach n8n webhook.",
      },
      { status: isTimeout ? 504 : 502 }
    );
  }
}
