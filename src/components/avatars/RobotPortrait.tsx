"use client";

import { motion } from "framer-motion";
import { AvatarState } from "@/lib/types";

interface RobotPortraitProps {
  name: string;
  color: string;
  emoji?: string;
  state?: AvatarState;
  size?: "card" | "stage" | "compact";
  highlighted?: boolean;
}

const sizeClasses = {
  compact: "h-12 w-12",
  card: "h-20 w-20 sm:h-24 sm:w-24",
  stage: "h-24 w-24 sm:h-28 sm:w-28 lg:h-32 lg:w-32",
};

function hashSeed(value: string) {
  return Array.from(value).reduce(
    (total, char, index) => total + char.charCodeAt(0) * (index + 3),
    0
  );
}

export default function RobotPortrait({
  name,
  color,
  emoji,
  state = "idle",
  size = "card",
  highlighted = false,
}: RobotPortraitProps) {
  const seed = hashSeed(name);
  const isSpeaking = state === "speaking";
  const isThinking = state === "thinking";
  const isListening = state === "listening";
  const eyeVariant = seed % 3;
  const antennaHeight = 12 + (seed % 8);
  const foreheadBars = 3 + (seed % 3);
  const mouthWidth = 22 + (seed % 8);
  const cheekOffset = 8 + (seed % 4);

  return (
    <motion.div
      className={`relative ${sizeClasses[size]}`}
      animate={{
        y: isListening ? [0, -1.5, 0] : 0,
        scale: highlighted || isSpeaking ? 1.03 : 1,
      }}
      transition={{
        duration: isListening ? 2.6 : 0.28,
        repeat: isListening ? Infinity : 0,
      }}
    >
      <div
        className="absolute inset-0 rounded-[32px] border"
        style={{
          borderColor: highlighted ? color : `${color}40`,
          background: `radial-gradient(circle at 35% 24%, ${color}2b, rgba(8, 13, 24, 0.98) 72%)`,
          boxShadow: highlighted || isSpeaking
            ? `0 0 0 2px ${color}1f, 0 16px 34px rgba(0, 0, 0, 0.38), 0 0 28px ${color}24`
            : "0 12px 28px rgba(0, 0, 0, 0.34)",
        }}
      />

      <svg
        viewBox="0 0 120 120"
        className="relative z-10 h-full w-full drop-shadow-[0_10px_28px_rgba(0,0,0,0.34)]"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`robot-shell-${seed}`} x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor={`${color}46`} />
            <stop offset="100%" stopColor="rgba(12, 18, 30, 0.96)" />
          </linearGradient>
          <linearGradient id={`robot-face-${seed}`} x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(226, 236, 255, 0.14)" />
            <stop offset="100%" stopColor="rgba(70, 95, 140, 0.06)" />
          </linearGradient>
        </defs>

        <motion.circle
          cx="60"
          cy="12"
          r="4"
          fill={color}
          animate={isThinking ? { opacity: [0.35, 1, 0.35] } : { opacity: 0.7 }}
          transition={{ duration: 1.15, repeat: isThinking ? Infinity : 0 }}
        />
        <line
          x1="60"
          y1="16"
          x2="60"
          y2={24 - antennaHeight}
          stroke={`${color}AA`}
          strokeWidth="3"
          strokeLinecap="round"
        />

        <circle cx={24 - cheekOffset / 2} cy="56" r="7" fill={`${color}18`} />
        <circle cx={96 + cheekOffset / 2} cy="56" r="7" fill={`${color}18`} />
        <circle cx={24 - cheekOffset / 2} cy="56" r="3.5" fill={`${color}55`} />
        <circle cx={96 + cheekOffset / 2} cy="56" r="3.5" fill={`${color}55`} />

        <rect
          x="22"
          y="24"
          width="76"
          height="72"
          rx="24"
          fill={`url(#robot-shell-${seed})`}
          stroke={highlighted || isSpeaking ? color : `${color}55`}
          strokeWidth={highlighted || isSpeaking ? 2.5 : 1.6}
        />
        <rect
          x="30"
          y="32"
          width="60"
          height="46"
          rx="16"
          fill={`url(#robot-face-${seed})`}
          stroke="rgba(255,255,255,0.08)"
        />

        {Array.from({ length: foreheadBars }).map((_, index) => (
          <rect
            key={index}
            x={37 + index * 14}
            y="40"
            width="10"
            height="3"
            rx="1.5"
            fill={`${color}${index === 1 ? "CC" : "66"}`}
          />
        ))}

        {eyeVariant === 0 ? (
          <>
            <motion.rect
              x="40"
              y="52"
              width="14"
              height="8"
              rx="4"
              fill="rgba(238, 247, 255, 0.95)"
              animate={
                isThinking
                  ? { y: [52, 49, 52] }
                  : isListening
                    ? { width: [14, 16, 14] }
                    : {}
              }
              transition={{ duration: 1.8, repeat: isThinking || isListening ? Infinity : 0 }}
            />
            <motion.rect
              x="66"
              y="52"
              width="14"
              height="8"
              rx="4"
              fill="rgba(238, 247, 255, 0.95)"
              animate={
                isThinking
                  ? { y: [52, 49, 52] }
                  : isListening
                    ? { width: [14, 16, 14] }
                    : {}
              }
              transition={{ duration: 1.8, repeat: isThinking || isListening ? Infinity : 0 }}
            />
          </>
        ) : eyeVariant === 1 ? (
          <>
            <motion.circle
              cx="47"
              cy="56"
              r="5"
              fill="rgba(238, 247, 255, 0.95)"
              animate={isThinking ? { cy: [56, 52, 56] } : {}}
              transition={{ duration: 1.8, repeat: isThinking ? Infinity : 0 }}
            />
            <motion.circle
              cx="73"
              cy="56"
              r="5"
              fill="rgba(238, 247, 255, 0.95)"
              animate={isThinking ? { cy: [56, 52, 56] } : {}}
              transition={{ duration: 1.8, repeat: isThinking ? Infinity : 0 }}
            />
          </>
        ) : (
          <>
            <motion.path
              d="M40 58 L54 54"
              stroke="rgba(238, 247, 255, 0.95)"
              strokeWidth="4.5"
              strokeLinecap="round"
              animate={isThinking ? { d: ["M40 58 L54 54", "M40 55 L54 50", "M40 58 L54 54"] } : {}}
              transition={{ duration: 1.8, repeat: isThinking ? Infinity : 0 }}
            />
            <motion.path
              d="M66 54 L80 58"
              stroke="rgba(238, 247, 255, 0.95)"
              strokeWidth="4.5"
              strokeLinecap="round"
              animate={isThinking ? { d: ["M66 54 L80 58", "M66 50 L80 55", "M66 54 L80 58"] } : {}}
              transition={{ duration: 1.8, repeat: isThinking ? Infinity : 0 }}
            />
          </>
        )}

        {isSpeaking ? (
          <motion.rect
            x={60 - mouthWidth / 2}
            y="70"
            width={mouthWidth}
            height="8"
            rx="4"
            fill={`${color}C7`}
            animate={{ height: [7, 14, 7], y: [70, 67, 70] }}
            transition={{ duration: 0.28, repeat: Infinity }}
          />
        ) : (
          <rect
            x={60 - mouthWidth / 2}
            y="72"
            width={mouthWidth}
            height="4"
            rx="2"
            fill="rgba(237, 245, 255, 0.72)"
          />
        )}

        <rect
          x="42"
          y="88"
          width="36"
          height="10"
          rx="5"
          fill={`${color}24`}
          stroke="rgba(255,255,255,0.08)"
        />
      </svg>

      {emoji && (
        <div
          className="absolute -right-1 -top-1 z-20 flex h-7 w-7 items-center justify-center rounded-full border text-xs shadow-[0_8px_18px_rgba(0,0,0,0.32)]"
          style={{
            borderColor: `${color}55`,
            background: "rgba(10, 16, 28, 0.92)",
          }}
        >
          {emoji}
        </div>
      )}
    </motion.div>
  );
}
