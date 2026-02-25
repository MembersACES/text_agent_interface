import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/utils";

/**
 * API Route: GET Base 1 Landing Responses
 *
 * The browser calls THIS route (same origin, no CORS). This route then calls
 * the Python backend with the user's token. Backend is chosen by request host:
 * acesagentinterfacedev → dev backend, else production.
 */

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized", rows: [] }, { status: 401 });
    }

    const token = (session as any)?.id_token || (session as any)?.accessToken;
    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "No token", rows: [] }, { status: 401 });
    }

    const requestHost = request.headers.get("host") ?? undefined;
    const backendUrl = getApiBaseUrl(requestHost);
    const fullUrl = `${backendUrl}/api/base1-landing-responses`;

    const res = await fetch(fullUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[base1-landing-responses] Backend error:", res.status, text);
      return NextResponse.json(
        { rows: [], error: "Backend error", status: res.status },
        { status: res.status === 401 ? 401 : 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json({ rows: data.rows ?? [], user_email: data.user_email });
  } catch (err: any) {
    console.error("[base1-landing-responses] Error:", err);
    return NextResponse.json(
      { rows: [], error: err?.message ?? "Failed to load" },
      { status: 500 }
    );
  }
}
