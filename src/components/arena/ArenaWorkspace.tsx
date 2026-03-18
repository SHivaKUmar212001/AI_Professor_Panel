"use client";

import { useState } from "react";
import { useDiscussionStore } from "@/stores/discussion-store";
import Header from "@/components/layout/Header";
import AgentSelector from "@/components/agents/AgentSelector";
import TopicSelector from "@/components/topics/TopicSelector";
import DiscussionArena from "@/components/discussion/DiscussionArena";

type SetupStep = "agents" | "topic";

const setupSteps: { id: SetupStep; label: string; hint: string }[] = [
  {
    id: "agents",
    label: "Panel Assembly",
    hint: "Select the experts entering this session.",
  },
  {
    id: "topic",
    label: "Topic & Tone",
    hint: "Set the debate prompt, mode, and round depth.",
  },
];

export default function ArenaWorkspace() {
  const [step, setStep] = useState<SetupStep>("agents");
  const status = useDiscussionStore((s) => s.status);
  const selectedAgents = useDiscussionStore((s) => s.selectedAgents);
  const topic = useDiscussionStore((s) => s.topic);
  const setStatus = useDiscussionStore((s) => s.setStatus);

  if (status === "running" || status === "completed" || status === "error") {
    return (
      <div className="min-h-screen pb-6">
        <Header />
        <main className="mx-auto mt-4 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="panel-surface futuristic-outline overflow-hidden rounded-[30px]">
            <DiscussionArena />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-10">
      <Header />

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pt-6 sm:px-6 lg:px-8">
        <section className="panel-surface futuristic-outline rounded-[30px] p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="hud-label">Panel workspace</p>
              <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
                Configure a new <span className="accent-text">council session</span>
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/58 sm:text-base">
                Assemble your panel, choose the topic framing, and decide whether the discussion should
                lean student-friendly or stay closer to an expert seminar.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {setupSteps.map((item) => {
                const isCurrent = step === item.id;
                const isUnlocked = item.id === "agents" || selectedAgents.length >= 2;

                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!isUnlocked}
                    onClick={() => setStep(item.id)}
                    className={`rounded-2xl border p-4 text-left ${
                      isCurrent
                        ? "border-cyan-300/30 bg-cyan-400/12"
                        : "border-white/10 bg-white/[0.04] hover:border-white/20"
                    } ${!isUnlocked ? "opacity-45 cursor-not-allowed" : ""}`}
                  >
                    <p className="hud-label">{item.label}</p>
                    <p className="mt-2 text-sm leading-6 text-white/62">{item.hint}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="panel-surface futuristic-outline rounded-[30px] p-5 sm:p-8">
          {step === "agents" ? (
            <>
              <AgentSelector />
              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => setStep("topic")}
                  disabled={selectedAgents.length < 2}
                  className="rounded-2xl border border-cyan-300/30 bg-cyan-400/12 px-6 py-3 text-sm font-semibold text-cyan-50 shadow-[0_0_32px_rgba(22,213,255,0.14)] hover:-translate-y-0.5 hover:bg-cyan-400/16 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Next: Choose Topic
                </button>
              </div>
            </>
          ) : (
            <>
              <TopicSelector />
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
                <button
                  onClick={() => setStep("agents")}
                  className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white/68 hover:border-white/20 hover:text-white"
                >
                  Back to Panel
                </button>
                <button
                  onClick={() => setStatus("running")}
                  disabled={!topic}
                  className="rounded-2xl border border-cyan-300/30 bg-cyan-400/12 px-8 py-3 text-sm font-semibold text-cyan-50 shadow-[0_0_32px_rgba(22,213,255,0.14)] hover:-translate-y-0.5 hover:bg-cyan-400/16 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Start Discussion
                </button>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
