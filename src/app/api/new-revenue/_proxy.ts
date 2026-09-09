import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/utils";

export async function proxyNewRevenue(
  req: NextRequest,
  backendPath: string,
  method: "POST" | "PATCH" = "POST"
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const requestHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const backendUrl = getApiBaseUrl(requestHost);
  const token = (session as { id_token?: string; accessToken?: string })?.id_token
    || (session as { accessToken?: string })?.accessToken;
  const apiKey = process.env.BACKEND_API_KEY || "test-key";
  const authToken =
    token && token !== "undefined" && typeof token === "string" ? token : apiKey;

  const backendResponse = await fetch(`${backendUrl}${backendPath}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      ...body,
      user_email: (session.user as { email?: string })?.email,
      refresh_token: (session as { refreshToken?: string })?.refreshToken,
    }),
  });

  const text = await backendResponse.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!backendResponse.ok) {
    return NextResponse.json(
      typeof data === "object" && data ? data : { error: text || "Backend error" },
      { status: backendResponse.status }
    );
  }

  return NextResponse.json(data);
}
