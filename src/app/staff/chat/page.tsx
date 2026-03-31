"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "ai";
  text: string;
}

export default function StaffChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", text: "Hi! I'm your QoM assistant. Ask me about inventory, sales, or tell me what you need to update. 📦" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "ai", text: data.reply || data.error || "Error" }]);
    } catch {
      setMessages(prev => [...prev, { role: "ai", text: "Connection error. Try again." }]);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
              msg.role === "user"
                ? "bg-teal text-white rounded-br-md"
                : "bg-staff-card border border-staff-border text-staff-text rounded-bl-md"
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-staff-card border border-staff-border px-4 py-2.5 rounded-2xl rounded-bl-md text-sm text-staff-text2">
              <span className="animate-pulse">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2 pt-2 border-t border-staff-border">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Ask about inventory, sales..."
          autoFocus
          className="flex-1 px-4 py-3 rounded-xl border border-staff-border bg-staff-card text-staff-text text-sm"
        />
        <button onClick={send} disabled={!input.trim() || loading}
          className="px-5 py-3 rounded-xl bg-teal text-white font-medium disabled:opacity-40">
          Send
        </button>
      </div>
    </div>
  );
}
