import { runHelpTool } from "./help";

export async function runTool(message: string) {
  const lower = message.toLowerCase();

  // We only have one tool for now — the help/explain one
  if (
    lower.includes("help") ||
    lower.includes("explain") ||
    lower.includes("how do i") ||
    lower.includes("where can i") ||
    lower.includes("generate") ||
    lower.includes("create") ||
    lower.includes("make")
  ) {
    return await runHelpTool(message);
  }

  // No tool matched — let the LLM handle it conversationally
  return null;
}
