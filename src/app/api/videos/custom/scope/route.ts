import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { scopeCustomVideo } from "@/lib/video-custom-llm";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const message = typeof body.message === "string" ? body.message : "";
    const title = typeof body.title === "string" ? body.title : "";
    const slug = typeof body.slug === "string" ? body.slug : "";
    const sourceExcerpt = typeof body.sourceExcerpt === "string" ? body.sourceExcerpt : "";
    const history = Array.isArray(body.history) ? body.history : [];

    if (!title.trim() || !sourceExcerpt.trim()) {
      return NextResponse.json({ error: "title and sourceExcerpt are required" }, { status: 400 });
    }

    const result = await scopeCustomVideo({
      message,
      history,
      title: title.trim(),
      slug: slug.trim(),
      sourceExcerpt,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Scope chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
