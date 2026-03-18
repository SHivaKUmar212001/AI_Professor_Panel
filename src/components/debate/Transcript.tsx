"use client";

import { DiscussionMessage } from "@/lib/types";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";

interface TranscriptProps {
  messages: DiscussionMessage[];
}

export default function Transcript({ messages }: TranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const transcriptEntries = messages.map((msg, index) => ({
    message: msg,
    showRoundHeader:
      index === 0 || messages[index - 1]?.round !== msg.round,
  }));

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex min-h-[8rem] items-center justify-center rounded-[20px] border border-dashed border-white/10 bg-white/[0.02] text-sm text-white/25">
        Transcript will appear here as agents speak.
      </div>
    );
  }
  return (
    <div className="rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,14,24,0.95),rgba(5,10,18,0.98))]">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
        <span className="text-[10px] uppercase tracking-[0.22em] text-white/35">The Transcript</span>
        <span className="text-[10px] uppercase tracking-[0.22em] text-white/25">
          {messages.length} message{messages.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div ref={scrollRef} className="max-h-[40vh] overflow-y-auto p-4 space-y-2">
        {transcriptEntries.map(({ message: msg, showRoundHeader }) => {
          return (
            <div key={msg.id}>
              {showRoundHeader && (
                <div className="my-2 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/5" />
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/25">
                    Round {msg.round}
                  </span>
                  <div className="h-px flex-1 bg-white/5" />
                </div>
              )}
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2 rounded-xl px-2 py-1.5 hover:bg-white/[0.02]"
              >
                <span
                  className="mt-0.5 h-full w-0.5 shrink-0 rounded-full"
                  style={{ backgroundColor: msg.agentColor }}
                />
                <div className="min-w-0">
                  <span className="text-xs font-semibold" style={{ color: msg.agentColor }}>
                    {msg.agentEmoji} {msg.agentName.split(" ").pop()}
                  </span>
                  <p className="mt-0.5 text-xs leading-5 text-white/65">
                    {msg.text}
                  </p>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
