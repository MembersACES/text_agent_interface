import { runHelpTool } from "./help";

export async function runTool(message: string) {
  const lower = message.toLowerCase();

  // Help/explain tool triggers
  if (
    lower.includes("help") ||
    lower.includes("explain") ||
    lower.includes("how do i") ||
    lower.includes("where can i") ||
    lower.includes("where is") ||
    lower.includes("how to") ||
    lower.includes("generate") ||
    lower.includes("create") ||
    lower.includes("make") ||
    lower.includes("solution") ||
    lower.includes("finance") ||
    lower.includes("robot") ||
    lower.includes("renewable") ||
    lower.includes("solar") ||
    lower.includes("waste") ||
    lower.includes("recycling") ||
    lower.includes("energy") ||
    lower.includes("ai bot") ||
    lower.includes("cleaning bot") ||
    lower.includes("voice agent") ||
    lower.includes("profile reset") ||
    lower.includes("asset") ||
    lower.includes("ghg") ||
    lower.includes("carbon") ||
    lower.includes("savings") ||
    lower.includes("invoice") ||
    lower.includes("first month") ||
    lower.includes("1st month")
  ) {
    return await runHelpTool(message);
  }

  // No tool matched — let the LLM handle it conversationally
  return null;
}
