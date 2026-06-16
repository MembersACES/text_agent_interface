const SCOPE_SYSTEM =
  "You are scoping a custom Carbon Zero Australasia (CZA) presentation video. " +
  "Ask ONE focused clarifying question at a time about: target audience, desired length (30s cut vs 3-minute), " +
  "key message/CTA, tone, and any legal/compliance constraints. " +
  "Keep replies under 120 words. When you have enough to draft 4–6 slides, end your message with [READY] on its own line.";

const GENERATE_SYSTEM =
  "You draft CZA-branded presentation videos. Return ONLY valid JSON (no markdown fences) with shape: " +
  '{"slides":[{"title":"...","narration":"...","bullets":["..."]}]} . ' +
  "Create 4–6 slides. Narration is spoken voiceover (Australian English, professional, no hype). " +
  "Bullets are on-screen points (short). Use facts from the source material and scope notes only — do not invent savings figures.";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

async function openaiChat(system: string, messages: ChatMessage[]): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: system }, ...messages],
      temperature: 0.4,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || res.statusText || "OpenAI request failed");
  }
  const reply = data?.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error("Model returned no text");
  return reply;
}

export async function scopeCustomVideo(params: {
  message: string;
  history: { role: string; content: string }[];
  title: string;
  slug: string;
  sourceExcerpt: string;
}): Promise<{ reply: string; readyToGenerate: boolean }> {
  const system =
    SCOPE_SYSTEM +
    `\n\nProject title: ${params.title}\nSlug: ${params.slug}\n\nSource excerpt:\n${params.sourceExcerpt.slice(0, 4000)}`;

  const messages: ChatMessage[] = params.history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-10)
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  if (messages.length === 0) {
    messages.push({
      role: "user",
      content: "I've uploaded the source material above. Please ask your first scoping question.",
    });
  } else if (params.message.trim()) {
    messages.push({ role: "user", content: params.message.trim() });
  }

  const reply = await openaiChat(system, messages);
  const readyToGenerate = /\[READY\]\s*$/i.test(reply) || reply.includes("[READY]");
  const cleaned = reply.replace(/\n?\[READY\]\s*$/i, "").trim();
  return { reply: cleaned, readyToGenerate };
}

export async function generateCustomVideoSlides(params: {
  title: string;
  slug: string;
  sourceExcerpt: string;
  scopeHistory: { role: string; content: string }[];
}): Promise<string> {
  const scopeNotes = params.scopeHistory
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n")
    .slice(0, 6000);

  const userPrompt =
    `Title: ${params.title}\nSlug: ${params.slug}\n\nScope conversation:\n${scopeNotes}\n\nSource material:\n${params.sourceExcerpt.slice(0, 6000)}`;

  return openaiChat(GENERATE_SYSTEM, [{ role: "user", content: userPrompt }]);
}
