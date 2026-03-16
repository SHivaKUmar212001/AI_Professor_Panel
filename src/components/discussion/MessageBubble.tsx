"use client";

import { motion } from "framer-motion";

interface MessageBubbleProps {
  agentName: string;
  agentEmoji: string;
  agentColor: string;
  text: string;
  isUser?: boolean;
  turnInRound?: number;
}

export default function MessageBubble({
  agentName,
  agentEmoji,
  agentColor,
  text,
  isUser,
}: MessageBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`flex w-full max-w-[48rem] items-end gap-3 ${
          isUser ? "flex-row-reverse" : "flex-row"
        }`}
      >
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-base shadow-[0_12px_30px_rgba(0,0,0,0.22)] ${
            isUser ? "border-emerald-300/25 bg-emerald-400/10" : "bg-[#101b2b]"
          }`}
          style={
            isUser
              ? undefined
              : {
                  borderColor: `${agentColor}30`,
                  background: `radial-gradient(circle at 35% 30%, ${agentColor}28, rgba(16, 27, 43, 0.96))`,
                }
          }
        >
          {agentEmoji}
        </div>

        <div
          className={`relative overflow-hidden rounded-[24px] border px-4 py-3.5 shadow-[0_16px_40px_rgba(0,0,0,0.24)] sm:px-5 ${
            isUser
              ? "bg-[linear-gradient(180deg,rgba(33,90,69,0.96),rgba(24,64,52,0.98))] text-white"
              : "bg-[linear-gradient(180deg,rgba(17,25,39,0.98),rgba(11,18,30,0.98))] text-white/88"
          }`}
          style={
            isUser
              ? { borderColor: "rgba(94, 234, 212, 0.18)" }
              : { borderColor: `${agentColor}24` }
          }
        >
          {!isUser && (
            <div
              className="absolute inset-x-0 top-0 h-px"
              style={{
                background: `linear-gradient(90deg, transparent, ${agentColor}, transparent)`,
              }}
            />
          )}

          <div
            className={`mb-2 flex items-center gap-2 ${
              isUser ? "justify-end" : "justify-start"
            }`}
          >
            <span
              className={`text-sm font-semibold ${
                isUser ? "text-emerald-50" : ""
              }`}
              style={isUser ? undefined : { color: agentColor }}
            >
              {agentName}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] ${
                isUser
                  ? "border border-emerald-200/15 bg-emerald-200/10 text-emerald-50/80"
                  : "border border-white/10 bg-white/5 text-white/42"
              }`}
            >
              {isUser ? "You" : "Panel"}
            </span>
          </div>

          <p
            className={`whitespace-pre-wrap text-[14px] leading-6 sm:text-[15px] sm:leading-7 ${
              isUser ? "text-white/92" : "text-white/84"
            }`}
          >
            {text}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
