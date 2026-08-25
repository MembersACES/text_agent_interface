import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/utils";

/**
 * DELETE a staff-created solution type.
 * Built-in types are rejected by the backend (400).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ solutionType: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { solutionType } = await params;
    if (!solutionType?.trim()) {
      return NextResponse.json({ error: "solution_type is required" }, { status: 400 });
    }

    const requestHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const backendUrl = getApiBaseUrl(requestHost);
    const token = (session as { id_token?: string; accessToken?: string } | null)?.id_token
      || (session as { id_token?: string; accessToken?: string } | null)?.accessToken;
    const apiKey = process.env.BACKEND_API_KEY || "test-key";
    const authToken = token && token !== "undefined" && typeof token === "string" ? token : apiKey;

    const backendResponse = await fetch(
      `${backendUrl}/api/testimonials/solution-content/${encodeURIComponent(solutionType.trim())}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    if (backendResponse.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await backendResponse.json().catch(() => ({}));
    const detail = data.detail || data.error || "Failed to delete type";
    return NextResponse.json(
      { error: typeof detail === "string" ? detail : "Failed to delete type" },
      { status: backendResponse.status }
    );
  } catch (error: unknown) {
    console.error("Error deleting testimonial solution type:", error);
    const message = error instanceof Error ? error.message : "Failed to delete type";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
