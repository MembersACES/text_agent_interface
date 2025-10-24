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
                "You are the ACES Floating Agent — a friendly, knowledgeable AI that guides users through the ACES dashboard and can access ACES tools when needed.",
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
  