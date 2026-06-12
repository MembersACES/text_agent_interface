import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/utils";

/**
 * PATCH Drive file_id on an existing 1st Month Savings invoice row (sheet column H).
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { business_name, invoice_number, file_id, invoice_file_id } = body;
    const resolvedFileId = (file_id || invoice_file_id || "").trim();

    if (!business_name || !invoice_number || !resolvedFileId) {
      return NextResponse.json(
        { error: "business_name, invoice_number and file_id are required" },
        { status: 400 }
      );
    }

    const requestHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const backendUrl = getApiBaseUrl(requestHost);
    const token = (session as any)?.id_token || (session as any)?.accessToken;
    const apiKey = process.env.BACKEND_API_KEY || "test-key";
    const authToken =
      token && token !== "undefined" && typeof token === "string" ? token : apiKey;

    const backendResponse = await fetch(`${backendUrl}/api/one-month-savings/file-id`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        business_name,
        invoice_number,
        file_id: resolvedFileId,
        user_email: (session.user as any)?.email,
      }),
    });

    if (!backendResponse.ok) {
      const errText = await backendResponse.text();
      return NextResponse.json(
        { error: errText || "Failed to update file_id" },
        { status: backendResponse.status }
      );
    }

    return NextResponse.json(await backendResponse.json());
  } catch (error: any) {
    console.error("Error updating invoice file_id:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update file_id" },
      { status: 500 }
    );
  }
}
