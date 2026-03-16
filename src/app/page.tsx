"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { agents } from "@/lib/agents";
import { topicCategories } from "@/lib/topics";
import Header from "@/components/layout/Header";
import { useDiscussionStore } from "@/stores/discussion-store";

const telemetry = [
  { label: "Expert personas", value: "20" },
  { label: "Discussion sets", value: "30+" },
  { label: "Response mode", value: "Live" },
];

const featureCards = [
  {
    title: "Multi-agent seminar",
    text: "Bring physicists, strategists, philosophers, and builders into one shared deliberation chamber.",
  },
  {
    title: "Adaptive tone controls",
    text: "Switch between student-friendly explanations and graduate-level technical discussion before a panel begins.",
  },
  {
    title: "Persistent accounts",
    text: "Create a personal access account so multiple users can enter the chamber with their own session history and identity.",
  },
];

export default function HomePage() {
  const { data: session } = useSession();
  const discussionStatus = useDiscussionStore((state) => state.status);
  const sampleAgents = agents.slice(0, 6);
  const featuredTopics = topicCategories.flatMap((cat) => cat.topics).slice(0, 4);

  return (
    <div className="min-h-screen pb-12">
      <Header />

      <main className="relative mx-auto flex max-w-7xl flex-col gap-8 px-4 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="panel-surface futuristic-outline panel-inner-glow rounded-[30px] p-6 sm:p-8 lg:p-10"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.26em] text-cyan-100">
                Advanced deliberation interface
              </span>
            </div>

            <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Build a panel of machine intellects and watch them{" "}
              <span className="accent-text">debate like the future already arrived.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-white/62 sm:text-lg">
              Cortex Council gives every user a private control deck for orchestrating live AI professor panels,
              shifting between student-friendly clarity and academic rigor while preserving the drama of real-time debate.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={session?.user ? "/arena" : "/register"}
                className="rounded-2xl border border-cyan-300/35 bg-cyan-400/12 px-6 py-3.5 text-center text-sm font-semibold text-cyan-50 shadow-[0_0_32px_rgba(22,213,255,0.16)] hover:-translate-y-0.5 hover:bg-cyan-400/16"
              >
                {session?.user ? "Enter the council" : "Create your access account"}
              </Link>
              <Link
                href={session?.user ? "/arena" : "/login"}
                className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3.5 text-center text-sm font-semibold text-white/75 hover:-translate-y-0.5 hover:border-white/20 hover:text-white"
              >
                {session?.user
                  ? discussionStatus === "running"
                    ? "Resume live discussion"
                    : "Open your council"
                  : "Sign in to your deck"}
              </Link>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {telemetry.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <p className="hud-label">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12, ease: "easeOut" }}
            className="panel-surface futuristic-outline rounded-[30px] p-5 sm:p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="hud-label">Live preview</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Panel deck composition</h2>
              </div>
              <div className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-100">
                Online
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {sampleAgents.map((agent, index) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.08 * index }}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
                    style={{ backgroundColor: `${agent.color}1d` }}
                  >
                    {agent.emoji}
                  </div>
                  <p className="mt-3 text-sm font-semibold text-white">{agent.name}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/45">{agent.title}</p>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-[#081325]/90 p-4">
              <div className="flex items-center justify-between">
                <p className="hud-label">Operating state</p>
                <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-100">
                  {session?.user ? "Authenticated" : "Visitor"}
                </span>
              </div>
              <p className="mt-3 text-sm leading-7 text-white/62">
                {session?.user
                  ? `Signed in as @${session.user.username}. Your council deck is ready for a new panel assembly.`
                  : "Create an account to unlock private sessions, protected discussion streams, and a personalized professor panel workspace."}
              </p>
            </div>
          </motion.div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {featureCards.map((feature, index) => (
            <motion.article
              key={feature.title}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.18 + index * 0.08 }}
              className="panel-surface futuristic-outline rounded-[24px] p-5"
            >
              <p className="hud-label">Capability {index + 1}</p>
              <h3 className="mt-3 text-xl font-semibold text-white">{feature.title}</h3>
              <p className="mt-3 text-sm leading-7 text-white/58">{feature.text}</p>
            </motion.article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="panel-surface futuristic-outline rounded-[28px] p-6">
            <p className="hud-label">Discussion protocol</p>
            <h3 className="mt-3 text-2xl font-semibold text-white">From account access to live synthesis</h3>
            <div className="mt-5 space-y-3">
              {[
                "Create an account and enter your private seminar deck.",
                "Assemble a panel of 2-5 expert agents with distinct disciplines.",
                "Pick a topic, choose the discussion style, and stream the debate.",
              ].map((step, index) => (
                <div
                  key={step}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-400/10 text-sm font-semibold text-cyan-100">
                    0{index + 1}
                  </div>
                  <p className="text-sm leading-7 text-white/62">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-surface futuristic-outline rounded-[28px] p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="hud-label">Topic feed</p>
                <h3 className="mt-3 text-2xl font-semibold text-white">Mission-ready discussion prompts</h3>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.22em] text-white/45">
                Rotating set
              </span>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {featuredTopics.map((topic, index) => (
                <motion.div
                  key={topic.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.2 + index * 0.05 }}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <p className="hud-label">{topic.category}</p>
                  <p className="mt-3 text-sm leading-7 text-white/72">{topic.prompt}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
