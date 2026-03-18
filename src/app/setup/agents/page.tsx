"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { useDiscussionStore } from "@/stores/discussion-store";
import { agents } from "@/lib/agents";
import AgentCard from "@/components/agents/AgentCard";
import RobotPortrait from "@/components/avatars/RobotPortrait";
import Header from "@/components/layout/Header";

export default function AgentSelectPage() {
  const router = useRouter();
  const { status: authStatus } = useSession();
  const appMode = useDiscussionStore((s) => s.appMode);
  const selectedAgents = useDiscussionStore((s) => s.selectedAgents);
  const toggleAgent = useDiscussionStore((s) => s.toggleAgent);
  const setMentorAgent = useDiscussionStore((s) => s.setMentorAgent);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.replace("/login");
    if (!appMode) router.replace("/");
  }, [authStatus, appMode, router]);

  if (!appMode || authStatus !== "authenticated") return null;

  const isMentor = appMode === "mentor";
  const maxAgents = isMentor ? 1 : 5;
  const minAgents = isMentor ? 1 : 2;
  const canProceed = selectedAgents.length >= minAgents;

  const handleToggle = (agentId: string) => {
    if (isMentor) {
      setMentorAgent(agentId);
    } else {
      toggleAgent(agentId);
    }
  };

  // Selected agent detail for mentor mode
  const selectedMentor = isMentor && selectedAgents.length === 1
    ? agents.find((a) => a.id === selectedAgents[0])
    : null;

  return (
    <div className="min-h-screen pb-10">
      <Header />

      <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <section className="panel-surface futuristic-outline rounded-[30px] p-6 sm:p-8">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/")}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/60 hover:border-white/20 hover:text-white"
              >
                ← Back
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.2em]"
                    style={{
                      borderColor: isMentor ? "rgba(255,184,0,0.3)" : "rgba(103,243,255,0.3)",
                      color: isMentor ? "#FFB800" : "#67f3ff",
                      backgroundColor: isMentor ? "rgba(255,184,0,0.1)" : "rgba(103,243,255,0.1)",
                    }}
                  >
                    {isMentor ? "🎓 Mentor Mode" : "🎭 Debate Mode"}
                  </span>
                </div>
                <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                  {isMentor ? "Choose Your Mentor" : "Assemble Your Panel"}
                </h1>
                <p className="mt-1 text-sm text-white/45">
                  {isMentor
                    ? "Pick one mind to learn from."
                    : "Pick 2 to 5 minds. Watch them collide."}
                </p>
              </div>
            </div>
            {!isMentor && (
              <div
                className={`w-fit rounded-full px-3 py-1.5 text-sm font-mono ${
                  selectedAgents.length >= 2
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-white/5 text-white/40"
                }`}
              >
                {selectedAgents.length}/{maxAgents} selected
              </div>
            )}
          </div>

          {/* Flat agent grid — no category headers */}
          <div className="mt-6 grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-4 sm:gap-x-3 lg:grid-cols-5 xl:grid-cols-6">
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                selected={selectedAgents.includes(agent.id)}
                onToggle={() => handleToggle(agent.id)}
                disabled={
                  !isMentor &&
                  selectedAgents.length >= maxAgents &&
                  !selectedAgents.includes(agent.id)
                }
              />
            ))}
          </div>

          {/* Mentor: expanded detail for selected agent */}
          {selectedMentor && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 rounded-2xl border p-5"
              style={{
                borderColor: `${selectedMentor.color}30`,
                background: `linear-gradient(180deg, ${selectedMentor.color}08, transparent)`,
              }}
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0">
                  <RobotPortrait
                    name={selectedMentor.name}
                    color={selectedMentor.color}
                    emoji={selectedMentor.emoji}
                    size="compact"
                    state="listening"
                    highlighted
                  />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedMentor.name}</h3>
                  <p className="text-sm text-white/50">{selectedMentor.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">{selectedMentor.reasoningStyle}</p>
                  <p className="mt-2 text-sm italic text-white/50">&quot;{selectedMentor.signatureMove}&quot;</p>
                  <p className="mt-3 text-sm text-white/60">
                    <span style={{ color: selectedMentor.color }} className="font-semibold">This mentor will</span> challenge your assumptions with{" "}
                    {selectedMentor.expertise.slice(0, 2).join(" and ")} expertise, guiding you through Socratic discovery.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Debate: selected panel strip */}
          {!isMentor && selectedAgents.length > 0 && (
            <div className="sticky bottom-4 mt-6 rounded-2xl border border-white/10 bg-[#0B0F1A]/90 p-3 backdrop-blur-md">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="mr-1 text-xs uppercase tracking-[0.18em] text-white/42">
                  Your Panel
                </span>
                {selectedAgents.map((id) => {
                  const agent = agents.find((a) => a.id === id)!;
                  return (
                    <button
                      key={id}
                      onClick={() => toggleAgent(id)}
                      className="group flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-sm transition-all hover:border-red-400/50 hover:bg-red-500/10"
                      style={{ borderColor: `${agent.color}40` }}
                    >
                      <span>{agent.emoji}</span>
                      <span className="text-white/80">{agent.name.split(" ").pop()}</span>
                      <span className="ml-1 text-white/30 group-hover:text-red-400">×</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex justify-end">
            <button
              onClick={() => router.push("/setup/topics")}
              disabled={!canProceed}
              className="rounded-2xl border border-cyan-300/30 bg-cyan-400/12 px-6 py-3 text-sm font-semibold text-cyan-50 shadow-[0_0_32px_rgba(22,213,255,0.14)] hover:-translate-y-0.5 hover:bg-cyan-400/16 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Next: Choose Topic →
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
