import { NextResponse } from "next/server";
import { chatLLM } from "@/lib/floatingagent/llm";
import { runTool } from "@/lib/floatingagent/tools";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    console.log("🟢 FloatingAgent received:", message);

    // Try to run a tool first
    const toolResponse = await runTool(message);
    if (toolResponse) {
      return NextResponse.json({
        role: "assistant",
        text: toolResponse.message,
        suggestedPage: toolResponse.suggestedPage || null,
      });
    }

    // Otherwise, fall back to LLM
    const reply = await chatLLM(message);
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
