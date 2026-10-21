import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { chatWithTools } from "@/lib/floatingagent/llm";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const message = typeof body.message === "string" ? body.message : "";
    const currentPath = typeof body.currentPath === "string" ? body.currentPath : undefined;
    const history = Array.isArray(body.history) ? body.history : undefined;

    if (!message.trim()) {
      return NextResponse.json(
        { role: "assistant", text: "Ask me to find a member, show your tasks, or point you to a page." },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    const authToken =
      (session as { id_token?: string; accessToken?: string } | null)?.id_token ||
      (session as { id_token?: string; accessToken?: string } | null)?.accessToken ||
      null;

    const requestHost = req.headers.get("host") ?? undefined;

    const reply = await chatWithTools(message, {
      currentPath,
      history,
      toolContext: { authToken, requestHost },
    });

    return NextResponse.json({
      role: "assistant",
      text: reply.text,
      suggestedPage: reply.suggestedPage ?? null,
      suggestedLinks: reply.suggestedLinks ?? null,
    });
  } catch (error) {
    console.error("Floating agent error:", error);
    return NextResponse.json(
      { role: "assistant", text: "Something went wrong." },
      { status: 500 }
    );
  }
}
