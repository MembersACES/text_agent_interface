import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildCustomVideoReviewHtml, parseSlidesJson } from "@/lib/video-custom-html";
import { generateCustomVideoSlides } from "@/lib/video-custom-llm";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 503 });
    }

    const formData = await req.formData();
    const title = String(formData.get("title") || "").trim();
    const slug = String(formData.get("slug") || "").trim();
    const sourceExcerpt = String(formData.get("sourceExcerpt") || "").trim();
    const scopeHistoryRaw = String(formData.get("scopeHistory") || "[]");
    const file = formData.get("file");

    if (!title || !sourceExcerpt || !(file instanceof File)) {
      return NextResponse.json({ error: "title, sourceExcerpt, and file are required" }, { status: 400 });
    }

    let scopeHistory: { role: string; content: string }[] = [];
    try {
      scopeHistory = JSON.parse(scopeHistoryRaw);
    } catch {
      scopeHistory = [];
    }

    const rawSlides = await generateCustomVideoSlides({
      title,
      slug,
      sourceExcerpt,
      scopeHistory,
    });
    const slides = parseSlidesJson(rawSlides);
    if (!slides.length) {
      return NextResponse.json({ error: "Could not generate slides — try again" }, { status: 502 });
    }

    const html = buildCustomVideoReviewHtml(title, slug || title, slides);

    const startFd = new FormData();
    startFd.append("file", file);
    startFd.append("title", title);
    startFd.append("slug", slug || title);
    startFd.append(
      "brief_json",
      JSON.stringify({ scopeHistory, slides, reviewHtmlLength: html.length })
    );

    const requestHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const startRes = await fetch(
      `${req.nextUrl.origin}/api/videos/custom/start`,
      { method: "POST", body: startFd, headers: { cookie: req.headers.get("cookie") || "" } }
    );
    const startData = await startRes.json().catch(() => ({}));
    if (!startRes.ok) {
      const err = startData as { error?: string; detail?: string };
      return NextResponse.json(
        { error: err.error || err.detail || "Failed to register video draft" },
        { status: startRes.status }
      );
    }

    return NextResponse.json({
      html,
      slides,
      slug: (startData as { slug?: string }).slug || slug,
      cli: (startData as { cli?: string[] }).cli || [],
      videos: (startData as { videos?: unknown[] }).videos || [],
      pack_folder_url: (startData as { pack_folder_url?: string }).pack_folder_url,
      pack_folder_name: (startData as { pack_folder_name?: string }).pack_folder_name,
      pack_parent_folder_url: (startData as { pack_parent_folder_url?: string }).pack_parent_folder_url,
      pack_error: (startData as { pack_error?: string }).pack_error,
      pack_warnings: (startData as { pack_warnings?: string[] }).pack_warnings,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Generate failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
