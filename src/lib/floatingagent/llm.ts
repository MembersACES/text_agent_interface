export async function chatLLM(message: string) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are the ACES Floating Agent — a friendly, knowledgeable AI that guides users through the ACES dashboard and can access ACES tools when needed.\n\n" +
                "ACES offers a comprehensive range of sustainable solutions including:\n" +
                "- Sustainable Platforms\n" +
                "- AI Cleaning Bots (autonomous cleaning robots)\n" +
                "- Digital Voice Agents (24/7 AI customer service)\n" +
                "- Profile Reset (utility optimization)\n" +
                "- Renewable Energy (solar rooftop, car park, farms)\n" +
                "- Resource Recovery (waste recycling)\n" +
                "- Asset Optimisation (demand response, incentives, carbon credits)\n" +
                "- Other Solutions (backup power, refrigeration)\n" +
                "- GHG Reporting (greenhouse gas compliance)\n" +
                "- Robot Finance (finance partner programs and rent-to-own options)\n\n" +
                "Users can explore all solutions in the Solution Range page. When users ask about solutions, services, or specific categories, direct them to the Solution Range page.",
            },
            { role: "user", content: message },
          ],
        }),
      });
  
      const data = await res.json();
  
      if (!res.ok) {
        console.error("❌ OpenAI API Error:", data);
        return `⚠️ OpenAI API error: ${data.error?.message || res.statusText}`;
      }
  
      const reply = data?.choices?.[0]?.message?.content?.trim();
      if (!reply) {
        console.error("⚠️ Empty reply from model:", data);
        return "⚠️ Model returned no text.";
      }
  
      console.log("🤖 LLM raw reply:", reply);
      return reply;
    } catch (err) {
      console.error("💥 LLM fetch failed:", err);
      return "⚠️ Error connecting to the AI model.";
    }
  }
  