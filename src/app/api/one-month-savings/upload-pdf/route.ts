import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/utils";

const LOG_PREFIX = "[OMS_UPLOAD]";

type UploadErrorDetail = {
  error_code?: string;
  message?: string;
  remediation?: string;
  request_id?: string;
};

function parseBackendError(errorText: string): UploadErrorDetail & { raw?: string } {
  try {
    const outer = JSON.parse(errorText);
    const detail = outer?.detail;
    if (typeof detail === "string") {
      return { message: detail, raw: errorText };
    }
    if (detail && typeof detail === "object") {
      return detail as UploadErrorDetail;
    }
    if (outer?.message) {
      return { message: String(outer.message), raw: errorText };
    }
  } catch {
    // not JSON
  }
  return { message: errorText || "Failed to upload PDF to Google Drive", raw: errorText };
}

/**
 * Proxies to backend → n8n file-upload webhook (upload_type=one_month_savings_invoice).
 * Logs: [OMS_UPLOAD]. See backend docs/FILE_UPLOAD_N8N.md.
 */
export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error_code: "UNAUTHORIZED", message: "Unauthorized", request_id: requestId },
        { status: 401 }
      );
    }

    const requestData = await req.json();

    if (!requestData.pdf_base64 || !requestData.filename) {
      console.warn(
        `${LOG_PREFIX} FAIL | request_id=${requestId} | error_code=MISSING_FIELDS | message=pdf_base64 and filename required`
      );
      return NextResponse.json(
        {
          error_code: "MISSING_FIELDS",
          message: "Missing required fields: pdf_base64 and filename",
          request_id: requestId,
        },
        { status: 400 }
      );
    }

    const requestHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const backendUrl = getApiBaseUrl(requestHost);

    const accessToken = (session as any)?.accessToken;
    const refreshToken = (session as any)?.refreshToken;
    const apiKey = process.env.BACKEND_API_KEY || "test-key";
    const authToken =
      accessToken && accessToken !== "undefined" && typeof accessToken === "string"
        ? accessToken
        : apiKey;

    const invoiceNumber = requestData.invoice_number ?? "";
    const fullUrl = `${backendUrl}/api/one-month-savings/upload-pdf`;

    console.info(
      `${LOG_PREFIX} | request_id=${requestId} | invoice=${invoiceNumber} | stage=proxy_start | ` +
        `has_access_token=${!!accessToken} | has_refresh_token=${!!refreshToken} | backend=${fullUrl}`
    );

    const backendResponse = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        ...requestData,
        request_id: requestId,
        user_email: (session.user as any)?.email,
        refresh_token: refreshToken,
      }),
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      const parsed = parseBackendError(errorText);
      console.error(
        `${LOG_PREFIX} FAIL | request_id=${parsed.request_id || requestId} | invoice=${invoiceNumber} | ` +
          `stage=proxy_backend | http=${backendResponse.status} | error_code=${parsed.error_code || "BACKEND_ERROR"} | ` +
          `message=${parsed.message || "unknown"}`
      );
      return NextResponse.json(
        {
          error_code: parsed.error_code || "DRIVE_UPLOAD_FAILED",
          message: parsed.message || "Failed to upload PDF to Google Drive",
          remediation: parsed.remediation,
          request_id: parsed.request_id || requestId,
        },
        { status: backendResponse.status }
      );
    }

    const result = await backendResponse.json();
    console.info(
      `${LOG_PREFIX} | request_id=${result.request_id || requestId} | invoice=${invoiceNumber} | ` +
        `stage=proxy_success | file_id=${result.file_id || result.fileId || ""}`
    );
    return NextResponse.json({ ...result, request_id: result.request_id || requestId });
  } catch (error: any) {
    console.error(
      `${LOG_PREFIX} FAIL | request_id=${requestId} | stage=proxy_exception | error_code=INTERNAL | message=${error?.message}`
    );
    return NextResponse.json(
      {
        error_code: "INTERNAL",
        message: error.message || "Failed to upload PDF",
        request_id: requestId,
      },
      { status: 500 }
    );
  }
}
