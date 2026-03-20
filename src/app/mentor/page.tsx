"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDiscussionStore } from "@/stores/discussion-store";
import { agents as allAgents } from "@/lib/agents";
import Header from "@/components/layout/Header";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function MentorPage() {
  const router = useRouter();
  const { status: authStatus } = useSession();
  const appMode = useDiscussionStore((s) => s.appMode);
  const selectedAgents = useDiscussionStore((s) => s.selectedAgents);
  const topic = useDiscussionStore((s) => s.topic);
  const reset = useDiscussionStore((s) => s.reset);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  const agentId = selectedAgents[0];
  const agent = allAgents.find((a) => a.id === agentId);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.replace("/login");
    if (appMode !== "mentor" || !agentId) router.replace("/");
  }, [authStatus, appMode, agentId, router]);

  // Auto-scroll
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, streamingText]);

  // Send message to mentor API
  const sendToMentor = useCallback(async (
    conversationHistory: { role: string; content: string }[],
    userMessage?: string
  ) => {
    setIsStreaming(true);
    setStreamingText("");
    setError(null);

    try {
      const res = await fetch("/api/mentor/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          topicPrompt: topic,
          conversationHistory,
          userMessage,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Failed to get mentor response");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if ("token" in data) {
                fullText += data.token;
                setStreamingText(fullText);
              } else if ("fullText" in data) {
                fullText = data.fullText;
              } else if ("message" in data) {
                setError(data.message);
              }
            } catch {
              // skip malformed
            }
          }
        }
      }

      if (fullText) {
        setMessages((prev) => [
          ...prev,
          { id: `assistant_${Date.now()}`, role: "assistant", content: fullText },
        ]);
      }
    } catch (err) {
      console.error("Mentor error:", err);
      setError(err instanceof Error ? err.message : "Failed to get mentor response");
    } finally {
      setIsStreaming(false);
      setStreamingText("");
    }
  }, [agentId, topic]);

  // Open conversation — mentor speaks first
  useEffect(() => {
    if (!initializedRef.current && agent && topic) {
      initializedRef.current = true;
      sendToMentor([], undefined);
    }
  }, [agent, topic, sendToMentor]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    const text = input.trim();
    setInput("");

    const userMsg: ChatMessage = { id: `user_${Date.now()}`, role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);

    const history = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    sendToMentor(history, text);
  };

  const handleEndSession = () => {
    reset();
    router.push("/");
  };

  if (!agent) return null;

  return (
    <div className="flex h-screen flex-col">
      <Header />

      {/* Mentor header bar */}
      <div className="border-b border-white/10 px-4 py-3 sm:px-6"
        style={{
          background: `linear-gradient(90deg, ${agent.color}08, transparent)`,
        }}
      >
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full border text-2xl"
              style={{
                borderColor: `${agent.color}40`,
                background: `radial-gradient(circle at 35% 30%, ${agent.color}28, rgba(16, 27, 43, 0.96))`,
              }}
            >
              {agent.emoji}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">{agent.name}</h2>
              <p className="text-xs text-white/45">{agent.title}</p>
            </div>
            {/* Breathing presence indicator */}
            <motion.div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: agent.color }}
              animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.1, 0.9] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleEndSession}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/60 hover:border-white/20 hover:text-white"
            >
              End Session
            </button>
          </div>
        </div>
      </div>

      {/* Topic bar */}
      <div className="border-b border-white/5 px-4 py-2 sm:px-6">
        <p className="mx-auto max-w-4xl text-xs italic text-white/40">
          Topic: &quot;{topic}&quot;
        </p>
      </div>

      {/* Chat area */}
      <div
        ref={chatRef}
        className="flex-1 overflow-y-auto px-4 py-6 sm:px-6"
        style={{
          background: "linear-gradient(180deg, #0a1420 0%, #080e18 100%)",
        }}
      >
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-3 text-red-400 hover:text-red-300 underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex max-w-[80%] items-end gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                {msg.role === "assistant" && (
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-base"
                    style={{
                      borderColor: `${agent.color}30`,
                      background: `radial-gradient(circle at 35% 30%, ${agent.color}28, rgba(16, 27, 43, 0.96))`,
                    }}
                  >
                    {agent.emoji}
                  </div>
                )}
                <div
                  className={`rounded-[20px] border px-4 py-3 text-[14px] leading-6 sm:text-[15px] sm:leading-7 ${
                    msg.role === "user"
                      ? "border-emerald-400/18 bg-[linear-gradient(180deg,rgba(33,90,69,0.96),rgba(24,64,52,0.98))] text-white/92"
                      : "bg-[linear-gradient(180deg,rgba(17,25,39,0.98),rgba(11,18,30,0.98))] text-white/84"
                  }`}
                  style={msg.role === "assistant" ? { borderColor: `${agent.color}24` } : undefined}
                >
                  {msg.role === "assistant" && (
                    <p className="mb-1.5 text-xs font-semibold" style={{ color: agent.color }}>
                      {agent.name}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Streaming message */}
          <AnimatePresence>
            {isStreaming && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex w-full justify-start"
              >
                <div className="flex max-w-[80%] items-end gap-2.5">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-base"
                    style={{
                      borderColor: `${agent.color}30`,
                      background: `radial-gradient(circle at 35% 30%, ${agent.color}28, rgba(16, 27, 43, 0.96))`,
                    }}
                  >
                    {agent.emoji}
                  </div>
                  <div
                    className="rounded-[20px] border bg-[linear-gradient(180deg,rgba(17,25,39,0.98),rgba(11,18,30,0.98))] px-4 py-3 text-[14px] leading-6 text-white/84 sm:text-[15px] sm:leading-7"
                    style={{ borderColor: `${agent.color}24` }}
                  >
                    <p className="mb-1.5 text-xs font-semibold" style={{ color: agent.color }}>
                      {agent.name}
                    </p>
                    {streamingText ? (
                      <p className="whitespace-pre-wrap">
                        {streamingText}
                        <span
                          className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm"
                          style={{ backgroundColor: agent.color }}
                        />
                      </p>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: agent.color }}
                            animate={{ opacity: [0.25, 1, 0.25] }}
                            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-white/10 bg-[#0B0F1A]/80 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-4xl gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Type your message..."
            disabled={isStreaming}
            className="flex-1 rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="rounded-[18px] border border-cyan-300/20 bg-cyan-400/12 px-5 py-3 text-sm font-medium text-cyan-100 hover:bg-cyan-400/20 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Send ↑
          </button>
        </div>
      </div>
    </div>
  );
}
