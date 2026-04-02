import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const requestHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const backendUrl = getApiBaseUrl(requestHost);
    const token = (session as any)?.id_token || (session as any)?.accessToken;
    const apiKey = process.env.BACKEND_API_KEY || "test-key";
    const authToken =
      token && token !== "undefined" && typeof token === "string" ? token : apiKey;

    const res = await fetch(`${backendUrl}/api/solar-cleaning-quote/extract`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail =
        (typeof (data as { detail?: unknown }).detail === "string"
          ? (data as { detail: string }).detail
          : null) ||
        (data as { error?: string }).error ||
        "Extract failed";
      return NextResponse.json({ error: detail }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
