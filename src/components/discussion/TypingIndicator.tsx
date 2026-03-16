"use client";

import { motion } from "framer-motion";

interface TypingIndicatorProps {
  agentName: string;
  agentEmoji: string;
  agentColor: string;
}

export default function TypingIndicator({
  agentName,
  agentEmoji,
  agentColor,
}: TypingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      className="flex w-full justify-start"
    >
      <div className="flex w-full max-w-[42rem] items-end gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-base shadow-[0_12px_30px_rgba(0,0,0,0.22)]"
          style={{
            borderColor: `${agentColor}30`,
            background: `radial-gradient(circle at 35% 30%, ${agentColor}28, rgba(16, 27, 43, 0.96))`,
          }}
        >
          {agentEmoji}
        </div>
        <div
          className="rounded-[22px] border px-4 py-3"
          style={{
            borderColor: `${agentColor}24`,
            background:
              "linear-gradient(180deg, rgba(17,25,39,0.98), rgba(11,18,30,0.98))",
          }}
        >
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: agentColor }}>
              {agentName}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-white/42">
              Thinking
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: agentColor }}
                animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
                transition={{
                  duration: 1.1,
                  repeat: Infinity,
                  delay: i * 0.18,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
