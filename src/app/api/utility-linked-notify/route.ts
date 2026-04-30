import { NextRequest, NextResponse } from "next/server";

/**
 * Resolve FastAPI origin for server-side proxies only.
 * Do not use NEXT_PUBLIC_API_BASE_URL — it often points at this Next.js app (:3000).
 */
function getFastApiBackendBase(): string {
  const explicit = process.env.BACKEND_API_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    return "https://text-agent-backend-672026052958.australia-southeast2.run.app";
  }

  return "http://127.0.0.1:8000";
}

/** Absolute path on FastAPI — use URL(base) so BACKEND_API_URL=http://host:8000/api does NOT become …/api/api/… */
function fastApiWebhookUrl(base: string): string {
  const b = base.endsWith("/") ? base : `${base}/`;
  return new URL("/api/webhooks/utility-linked", b).href;
}

function fastApiWebhookFallbackUrl(base: string): string {
  const b = base.endsWith("/") ? base : `${base}/`;
  return new URL("/api/post-utility-linked", b).href;
}

/** Proxy to FastAPI POST /api/webhooks/utility-linked (server-side BACKEND_API_KEY). */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.business_name || !body?.utility_type) {
      return NextResponse.json(
        { error: "business_name and utility_type are required" },
        { status: 400 }
      );
    }

    const backendBase = getFastApiBackendBase();
    const hookUrlPrimary = fastApiWebhookUrl(backendBase);
    const hookUrlFallback = fastApiWebhookFallbackUrl(backendBase);
    const apiKey = process.env.BACKEND_API_KEY || "test-key";

    async function forward(url: string) {
      return fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
    }

    let res = await forward(hookUrlPrimary);
    if (res.status === 404) {
      console.warn(
        "[utility-linked-notify] primary URL 404, retry fallback",
        hookUrlFallback
      );
      res = await forward(hookUrlFallback);
    }

    const text = await res.text();
    const contentType = res.headers.get("content-type") || "";
    const looksLikeHtml = contentType.includes("text/html") || text.trimStart().startsWith("<!DOCTYPE");

    if (!res.ok) {
      if (looksLikeHtml) {
        console.warn(
          "[utility-linked-notify] Received HTML instead of FastAPI JSON. backendBase=%s",
          backendBase
        );
        return NextResponse.json(
          {
            error:
              "Backend URL resolved to something that returned Next.js/HTML (wrong host). Set BACKEND_API_URL in .env.local to your FastAPI origin, e.g. http://127.0.0.1:8000 (with or without /api)",
            resolvedBackendUrl: backendBase,
            attemptedUrls: [hookUrlPrimary, hookUrlFallback],
          },
          { status: 502 }
        );
      }
      console.warn("[utility-linked-notify] backend error", res.status, text.slice(0, 300));
      return NextResponse.json(
        {
          error: text || `Backend returned ${res.status}`,
          resolvedBackendUrl: backendBase,
          attemptedUrls: [hookUrlPrimary, hookUrlFallback],
        },
        { status: res.status }
      );
    }

    if (looksLikeHtml) {
      return NextResponse.json(
        {
          error:
            "Unexpected HTML success body — BACKEND_API_URL likely points at the Next app, not FastAPI.",
          resolvedBackendUrl: backendBase,
          attemptedUrls: [hookUrlPrimary, hookUrlFallback],
        },
        { status: 502 }
      );
    }

    try {
      return NextResponse.json(JSON.parse(text));
    } catch {
      return NextResponse.json({ ok: true, raw: text });
    }
  } catch (e) {
    console.error("[utility-linked-notify]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
