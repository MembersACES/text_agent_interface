import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { chatLLM } from "@/lib/floatingagent/llm";
import { runTool } from "@/lib/floatingagent/tools";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const message = typeof body.message === "string" ? body.message : "";
    const currentPath = typeof body.currentPath === "string" ? body.currentPath : undefined;
    const history = Array.isArray(body.history) ? body.history : undefined;

    const session = await getServerSession(authOptions);
    const authToken =
      (session as { id_token?: string; accessToken?: string } | null)?.id_token ||
      (session as { id_token?: string; accessToken?: string } | null)?.accessToken ||
      null;

    const requestHost = req.headers.get("host") ?? undefined;

    console.log("🟢 FloatingAgent received:", message);

    const toolContext = { authToken, currentPath, history, requestHost };

    const toolResponse = await runTool(message, toolContext);
    if (toolResponse) {
      return NextResponse.json({
        role: "assistant",
        text: toolResponse.message,
        suggestedPage: toolResponse.suggestedPage ?? null,
        suggestedLinks: toolResponse.suggestedLinks ?? null,
      });
    }

    const reply = await chatLLM(message, {
      currentPath: toolContext.currentPath,
      history: toolContext.history,
      toolContext: { authToken: toolContext.authToken },
    });
    console.log("🤖 LLM reply:", reply);

    return NextResponse.json({ role: "assistant", text: reply });
  } catch (error) {
    console.error("❌ FloatingAgent error:", error);
    return NextResponse.json(
      { role: "assistant", text: "⚠️ Something went wrong." },
      { status: 500 }
    );
  }
}

