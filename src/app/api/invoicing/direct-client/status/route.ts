import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/utils";

const ALLOWED_STATUSES = ["Generated", "Sent", "Paid"] as const;

/**
 * Update Direct client invoice status (Generated / Sent / Paid).
 * Forwards to the backend, which writes the stream's Google Sheet or Drive file.
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { stream, business_name, invoice_number, status, invoice_file_id } = body;

    if (!stream || !business_name || !invoice_number || !status) {
      return NextResponse.json(
        { error: "stream, business_name, invoice_number and status are required" },
        { status: 400 }
      );
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${ALLOWED_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const requestHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const backendUrl = getApiBaseUrl(requestHost);
    const token = (session as { id_token?: string; accessToken?: string }).id_token
      || (session as { accessToken?: string }).accessToken;
    const apiKey = process.env.BACKEND_API_KEY || "test-key";
    const authToken =
      token && token !== "undefined" && typeof token === "string" ? token : apiKey;

    const backendResponse = await fetch(`${backendUrl}/api/invoicing/direct-client/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        stream,
        business_name,
        invoice_number,
        status,
        invoice_file_id: invoice_file_id || "",
        user_email: session.user?.email,
      }),
    });

    if (!backendResponse.ok) {
      const errText = await backendResponse.text();
      return NextResponse.json(
        { error: errText || "Failed to update status" },
        { status: backendResponse.status }
      );
    }

    const result = await backendResponse.json();
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update status";
    console.error("Error updating direct-client invoice status:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
