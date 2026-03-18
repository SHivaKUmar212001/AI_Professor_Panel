"use client";

import { motion } from "framer-motion";
import { AvatarState } from "@/lib/types";
import RobotPortrait from "@/components/avatars/RobotPortrait";

interface AvatarProps {
  emoji: string;
  name: string;
  color: string;
  state: AvatarState;
}

export default function Avatar({ emoji, name, color, state }: AvatarProps) {
  const isSpeaking = state === "speaking";
  const isThinking = state === "thinking";
  const isListening = state === "listening";
  const isIdle = state === "idle";

  return (
    <motion.div
      className="flex flex-col items-center gap-2"
      animate={{
        scale: isSpeaking ? 1.08 : 1,
        opacity: isIdle ? 0.6 : 1,
      }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative">
        {/* Glow ring for speaking */}
        {isSpeaking && (
          <motion.div
            className="absolute -inset-2 rounded-full"
            style={{ background: `radial-gradient(circle, ${color}30, transparent)` }}
            animate={{ opacity: [0.5, 1, 0.5], scale: [0.95, 1.05, 0.95] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}

        {/* Thought bubble for thinking */}
        {isThinking && (
          <motion.div
            className="absolute -top-5 left-1/2 -translate-x-1/2 flex gap-1"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="rounded-full bg-white/40"
                style={{ width: 4 + i, height: 4 + i }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </motion.div>
        )}

        <RobotPortrait
          name={name}
          color={color}
          emoji={emoji}
          state={state}
          size="stage"
          highlighted={isSpeaking}
        />
      </div>

      {/* Name label */}
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.24em] sm:text-xs"
        style={{ color: isSpeaking ? color : "rgba(255,255,255,0.5)" }}
      >
        {name.split(" ").pop()}
      </p>
      <p className="text-[9px] uppercase tracking-wider text-white/25">
        {isSpeaking ? "Speaking" : isThinking ? "Thinking" : isListening ? "Listening" : "Idle"}
      </p>
    </motion.div>
  );
}
