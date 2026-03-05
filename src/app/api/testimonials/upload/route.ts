import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/utils";

/**
 * API Route: Upload testimonial document (multipart form: file, business_name, invoice_number?, status?, gdrive_folder_url?)
 */

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const business_name = formData.get("business_name") as string | null;
    const invoice_number = (formData.get("invoice_number") as string | null) || undefined;
    const status = (formData.get("status") as string | null) || "Draft";
    const gdrive_folder_url = (formData.get("gdrive_folder_url") as string | null) || undefined;

    if (!file || !business_name) {
      return NextResponse.json(
        { error: "Missing required fields: file, business_name" },
        { status: 400 }
      );
    }

    const requestHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const backendUrl = getApiBaseUrl(requestHost);
    const token = (session as any)?.id_token || (session as any)?.accessToken;
    const apiKey = process.env.BACKEND_API_KEY || "test-key";
    const authToken = token && typeof token === "string" ? token : apiKey;

    const body = new FormData();
    body.append("file", file);
    body.append("business_name", business_name);
    if (invoice_number) body.append("invoice_number", invoice_number);
    body.append("status", status);
    if (gdrive_folder_url) body.append("gdrive_folder_url", gdrive_folder_url);

    const backendResponse = await fetch(`${backendUrl}/api/testimonials/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
      body,
    });

    if (!backendResponse.ok) {
      const err = await backendResponse.text();
      let detail: string;
      try {
        const j = JSON.parse(err);
        detail = j.detail || err;
      } catch {
        detail = err || "Upload failed";
      }
      return NextResponse.json(
        { error: detail },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error uploading testimonial:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload testimonial" },
      { status: 500 }
    );
  }
}
