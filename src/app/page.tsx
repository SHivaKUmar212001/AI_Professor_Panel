"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { useDiscussionStore } from "@/stores/discussion-store";

const modes = [
  {
    id: "mentor" as const,
    emoji: "🎓",
    title: "Mentor Chamber",
    subtitle: "One-on-one with a faculty mind.",
    description:
      "Ask questions, get challenged, and learn in a guided one-on-one exchange with the mentor you choose.",
    cta: "Start Learning",
    accentFrom: "#FFB800",
    accentTo: "#FF8F00",
    glowColor: "rgba(255, 184, 0, 0.15)",
    borderColor: "rgba(255, 184, 0, 0.25)",
  },
  {
    id: "debate" as const,
    emoji: "🎭",
    title: "Council Debate",
    subtitle: "Stage a live faculty exchange.",
    description:
      "Assemble a council of AI faculty minds, let a moderator chair the room, and watch the sharpest disagreements unfold in real time.",
    cta: "Open the Council",
    accentFrom: "#67f3ff",
    accentTo: "#448AFF",
    glowColor: "rgba(103, 243, 255, 0.15)",
    borderColor: "rgba(103, 243, 255, 0.25)",
  },
];

export default function ModeSelectPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const setAppMode = useDiscussionStore((s) => s.setAppMode);
  const reset = useDiscussionStore((s) => s.reset);

  const handleSelect = (mode: "mentor" | "debate") => {
    reset();
    setAppMode(mode);
    if (session?.user) {
      router.push("/setup/agents");
    } else {
      router.push("/login");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="particle absolute w-1 h-1 rounded-full bg-cyan-500/20"
            style={{
              left: `${(i * 4.1 + 7) % 100}%`,
              top: `${(i * 6.3 + 13) % 100}%`,
              animationDuration: `${9 + (i % 6) * 2.5}s`,
              animationDelay: `${(i % 5) * 0.8}s`,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-center mb-12 relative z-10"
      >
        <div className="flex justify-center mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-lg font-bold text-cyan-100 shadow-[0_0_32px_rgba(22,213,255,0.2)]">
            CC
          </div>
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white">
          Cortex Council
        </h1>
        <p className="mt-3 text-[11px] uppercase tracking-[0.32em] text-cyan-100/55 sm:text-xs">
          Synthetic Faculty Console
        </p>
        <p className="mt-4 text-base sm:text-lg text-white/45">
          Convene a mentor or a full council of machine minds.
        </p>
      </motion.div>

      <div className="relative z-10 grid w-full max-w-4xl gap-5 sm:grid-cols-2">
        {modes.map((mode, index) => (
          <motion.button
            key={mode.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 + index * 0.1, ease: "easeOut" }}
            whileHover={{ y: -4, scale: 1.015 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelect(mode.id)}
            className="group relative flex flex-col items-start rounded-[28px] border p-6 sm:p-8 text-left transition-all duration-300"
            style={{
              borderColor: mode.borderColor,
              background: `linear-gradient(180deg, rgba(13,25,44,0.85), rgba(6,14,26,0.95))`,
            }}
          >
            {/* Hover glow */}
            <div
              className="absolute inset-0 rounded-[28px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background: `radial-gradient(circle at 50% 30%, ${mode.glowColor}, transparent 70%)`,
              }}
            />

            <div className="relative z-10">
              <span className="text-5xl sm:text-6xl">{mode.emoji}</span>

              <h2 className="mt-5 text-2xl sm:text-3xl font-bold text-white">
                {mode.title}
              </h2>
              <p
                className="mt-1 text-sm font-medium"
                style={{ color: mode.accentFrom }}
              >
                {mode.subtitle}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-white/50">
                {mode.description}
              </p>

              <div
                className="mt-6 inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition-all group-hover:shadow-lg"
                style={{
                  borderColor: mode.borderColor,
                  color: mode.accentFrom,
                  background: `linear-gradient(135deg, ${mode.accentFrom}12, ${mode.accentTo}08)`,
                }}
              >
                {mode.cta}
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
