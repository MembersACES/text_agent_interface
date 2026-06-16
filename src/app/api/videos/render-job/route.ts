import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const slug = req.nextUrl.searchParams.get("slug")?.trim();
    const jobId = req.nextUrl.searchParams.get("job_id")?.trim();
    if (!slug && !jobId) {
      return NextResponse.json({ error: "slug or job_id required" }, { status: 400 });
    }

    const requestHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const backendUrl = getApiBaseUrl(requestHost);
    const apiKey = process.env.BACKEND_API_KEY || "test-key";
    const params = new URLSearchParams();
    if (slug) params.set("slug", slug);
    if (jobId) params.set("job_id", jobId);

    const backendResponse = await fetch(`${backendUrl}/api/videos/render-job?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const text = await backendResponse.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text };
    }

    if (!backendResponse.ok) {
      const err = data as { detail?: string; error?: string };
      return NextResponse.json(
        { error: err.detail || err.error || "Job status unavailable" },
        { status: backendResponse.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Job status failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
