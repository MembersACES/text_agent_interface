"use client";
import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { linkifyPages } from "@/lib/floatingagent/utils/linkifyPages";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  suggestedPage?: string | null;
}

export default function FloatingAgentChat() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // 🔁 Restore chat from session storage (so it persists when switching pages)
  useEffect(() => {
    const saved = sessionStorage.getItem("floatingAgentChat");
    if (saved) setMessages(JSON.parse(saved));
  }, []);

  // 💾 Save chat to session storage whenever it updates
  useEffect(() => {
    sessionStorage.setItem("floatingAgentChat", JSON.stringify(messages));
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 🧭 Handle link clicks from assistant replies
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "A" && target.getAttribute("href")?.startsWith("/")) {
        e.preventDefault();
        const href = target.getAttribute("href");
        router.push(href!); // Navigate without closing chat
      }
    };
    document.addEventListener("click", handleLinkClick);
    return () => document.removeEventListener("click", handleLinkClick);
  }, [router]);

  // 🚀 Send message to the Floating Agent API
  async function sendMessage() {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const res = await fetch("/api/floatingagent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, data]);
    } catch (err) {
      console.error("Error sending message:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "⚠️ Sorry, something went wrong while fetching a reply." },
      ]);
    }
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white p-4 rounded-full shadow-lg hover:bg-emerald-700 transition"
      >
        {isOpen ? <X size={20} /> : <MessageSquare size={20} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-8 z-50 w-[460px] h-[620px] bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Chat Header */}
          <div className="bg-emerald-600 text-white px-4 py-3 font-semibold text-lg flex items-center justify-between">
            ACES Floating Agent 💬
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-200 transition"
            >
              <X size={22} />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 text-[15px] leading-relaxed">
            {messages.map((msg, i) => (
              <div key={i}>
                <div
                  className={`p-4 rounded-2xl max-w-[90%] whitespace-pre-line ${
                    msg.role === "user"
                      ? "bg-emerald-600 text-white ml-auto self-end"
                      : "bg-gray-100 text-gray-800"
                  }`}
                  dangerouslySetInnerHTML={{
                    __html:
                      msg.role === "assistant"
                        ? linkifyPages(msg.text)
                        : msg.text,
                  }}
                />
                {msg.suggestedPage && (
                  <button
                    onClick={() => router.push(msg.suggestedPage!)}
                    className="ml-3 mt-2 text-sm text-emerald-700 font-medium flex items-center hover:underline"
                  >
                    <ArrowRight className="w-4 h-4 mr-1" /> Go to page
                  </button>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input Bar */}
          <div className="p-4 border-t flex items-center space-x-2">
            <input
              type="text"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={sendMessage}
              className="bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-700 transition"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
