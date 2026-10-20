"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, ExternalLink } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { starterPrompts, type StarterPrompt } from "@/lib/floatingagent/catalog";

const WELCOME_MESSAGE =
  "I can find a member, show your tasks, summarise the CRM pipeline or the unsigned utility sites, check the autonomous queue, and open the right page — including a member's documents or utilities.";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  suggestedPage?: string | null;
  suggestedLinks?: { label: string; href: string }[] | null;
}

function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={index}>{part.slice(2, -2)}</strong>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}

export default function FloatingAgentChat() {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = sessionStorage.getItem("floatingAgentChat");
      return saved ? (JSON.parse(saved) as ChatMessage[]) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const prompts = starterPrompts(pathname);

  useEffect(() => {
    sessionStorage.setItem("floatingAgentChat", JSON.stringify(messages));
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    const userMsg: ChatMessage = { role: "user", text: trimmed };
    const history = messages.slice(-6).map((item) => ({
      role: item.role,
      content: item.text,
    }));
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setPending(true);

    try {
      const res = await fetch("/api/floatingagent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          currentPath: pathname,
          history,
        }),
      });
      const data = (await res.json().catch(() => null)) as ChatMessage | null;
      if (!data?.text) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: "Something went wrong while fetching a reply." },
        ]);
        return;
      }
      setMessages((prev) => [...prev, { ...data, role: "assistant" }]);
    } catch (err) {
      console.error("Error sending message:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Something went wrong while fetching a reply." },
      ]);
    } finally {
      setPending(false);
    }
  }

  function usePrompt(prompt: StarterPrompt) {
    if (prompt.fillOnly) {
      setInput(prompt.text);
      inputRef.current?.focus();
      return;
    }
    void sendText(prompt.text);
  }

  function clearChat() {
    setMessages([]);
    sessionStorage.removeItem("floatingAgentChat");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? "Close assistant" : "Open assistant"}
        aria-expanded={isOpen}
        className="fixed bottom-4 right-4 z-50 rounded-full bg-primary p-4 text-white shadow-lg transition hover:bg-primary-hover sm:bottom-6 sm:right-6"
      >
        {isOpen ? <X size={20} /> : <MessageSquare size={20} />}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Carbon Zero Assistant"
          className="fixed bottom-20 right-4 z-50 flex h-[min(40rem,calc(100vh-7rem))] w-[min(26rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-stroke bg-white shadow-2xl dark:border-dark-3 dark:bg-gray-dark sm:right-8"
        >
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-white">
            <p className="text-base font-semibold">Carbon Zero Assistant</p>
            <div className="flex items-center gap-3">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={clearChat}
                  className="text-sm font-medium text-white/80 hover:text-white"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close assistant"
                className="text-white hover:text-white/80"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm leading-relaxed">
            {messages.length === 0 && (
              <div className="max-w-[95%] rounded-2xl bg-gray-100 p-4 text-dark dark:bg-dark-2 dark:text-white">
                <p className="whitespace-pre-line">{WELCOME_MESSAGE}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {prompts.map((prompt) => (
                    <button
                      key={prompt.label}
                      type="button"
                      onClick={() => usePrompt(prompt)}
                      className="rounded-full border border-primary/30 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                    >
                      {prompt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i}>
                <div
                  className={`max-w-[95%] whitespace-pre-line rounded-2xl p-4 ${
                    msg.role === "user"
                      ? "ml-auto bg-primary text-white"
                      : "bg-gray-100 text-dark dark:bg-dark-2 dark:text-white"
                  }`}
                >
                  {msg.role === "assistant" ? <RichText text={msg.text} /> : msg.text}
                </div>
                {msg.role === "assistant" && msg.suggestedLinks && msg.suggestedLinks.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {msg.suggestedLinks.map((link) => (
                      <button
                        key={link.href}
                        type="button"
                        onClick={() => router.push(link.href)}
                        className="inline-flex items-center gap-1 rounded-lg border border-primary/30 px-2.5 py-1.5 text-sm font-medium text-primary hover:bg-primary/10"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {link.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {pending && (
              <div className="max-w-[95%] rounded-2xl bg-gray-100 p-4 text-dark dark:bg-dark-2 dark:text-dark-6">
                Looking that up…
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {messages.length > 0 && (
            <div className="flex gap-2 overflow-x-auto border-t border-stroke px-4 py-2 dark:border-dark-3">
              {prompts.map((prompt) => (
                <button
                  key={prompt.label}
                  type="button"
                  disabled={pending}
                  onClick={() => usePrompt(prompt)}
                  className="shrink-0 rounded-full border border-stroke px-3 py-1 text-xs font-medium text-dark hover:border-primary/50 hover:text-primary disabled:opacity-50 dark:border-dark-3 dark:text-dark-7"
                >
                  {prompt.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 border-t border-stroke p-3 dark:border-dark-3">
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask about a member, task, or page…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void sendText(input);
              }}
              disabled={pending}
              className="flex-1 rounded-xl border border-stroke bg-transparent px-4 py-2.5 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 dark:border-dark-3 dark:text-white"
            />
            <button
              type="button"
              onClick={() => void sendText(input)}
              disabled={pending || !input.trim()}
              aria-label="Send message"
              className="rounded-xl bg-primary p-3 text-white transition hover:bg-primary-hover disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
