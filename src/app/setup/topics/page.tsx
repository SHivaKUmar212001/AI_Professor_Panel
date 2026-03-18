"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useDiscussionStore } from "@/stores/discussion-store";
import { agents } from "@/lib/agents";
import { getAllTopics } from "@/lib/topics";
import Header from "@/components/layout/Header";

const allTopics = getAllTopics();

export default function TopicSelectPage() {
  const router = useRouter();
  const { status: authStatus } = useSession();
  const appMode = useDiscussionStore((s) => s.appMode);
  const selectedAgents = useDiscussionStore((s) => s.selectedAgents);
  const topic = useDiscussionStore((s) => s.topic);
  const setTopic = useDiscussionStore((s) => s.setTopic);
  const totalRounds = useDiscussionStore((s) => s.totalRounds);
  const setTotalRounds = useDiscussionStore((s) => s.setTotalRounds);
  const setStatus = useDiscussionStore((s) => s.setStatus);
  const [customTopic, setCustomTopic] = useState("");

  useEffect(() => {
    if (authStatus === "unauthenticated") router.replace("/login");
    if (!appMode) router.replace("/");
    if (selectedAgents.length === 0) router.replace("/setup/agents");
  }, [authStatus, appMode, selectedAgents, router]);

  if (!appMode || authStatus !== "authenticated") return null;

  const isMentor = appMode === "mentor";

  const handleCustomSubmit = () => {
    if (customTopic.trim()) {
      setTopic(customTopic.trim());
    }
  };

  const handleStart = () => {
    setStatus("running");
    router.push(isMentor ? "/mentor" : "/debate");
  };

  // Panel display
  const panelAgents = selectedAgents
    .map((id) => agents.find((a) => a.id === id))
    .filter(Boolean);

  return (
    <div className="min-h-screen pb-10">
      <Header />

      <main className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 lg:px-8">
        <section className="panel-surface futuristic-outline rounded-[30px] p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.push("/setup/agents")}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/60 hover:border-white/20 hover:text-white"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white sm:text-3xl">
                {isMentor ? "What do you want to explore?" : "What should they discuss?"}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase tracking-[0.18em] text-white/42">
                  {isMentor ? "Your mentor" : "Your panel"}:
                </span>
                {panelAgents.map((a) => a && (
                  <span key={a.id} className="text-xs" style={{ color: a.color }}>
                    {a.emoji} {isMentor ? `${a.name} (${a.title})` : a.name.split(" ").pop()}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Flat topic grid — no categories */}
          <div className="grid gap-2.5 sm:grid-cols-2">
            {allTopics.map((t) => {
              const isSelected = topic === t.prompt;
              return (
                <button
                  key={t.id}
                  onClick={() => setTopic(t.prompt)}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                    isSelected
                      ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-100"
                      : "border-white/10 bg-white/[0.02] text-white/70 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="leading-5">{t.prompt}</span>
                    {isSelected && (
                      <span className="shrink-0 rounded-full border border-cyan-300/30 bg-cyan-400/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-cyan-100">
                        ✓
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom input */}
          <div className="mt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs uppercase tracking-[0.2em] text-white/30">Or ask your own</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCustomSubmit()}
                placeholder="Type any question or topic..."
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
              />
              <button
                onClick={handleCustomSubmit}
                disabled={!customTopic.trim()}
                className="rounded-xl border border-cyan-500/30 bg-cyan-500/20 px-4 py-3 text-sm font-medium text-cyan-300 hover:bg-cyan-500/30 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Set
              </button>
            </div>
          </div>

          {/* Rounds — debate only */}
          {!isMentor && (
            <div className="mt-6">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60 mb-3">
                Rounds
              </h3>
              <div className="flex gap-2">
                {[3, 4, 5, 6, 7, 8].map((n) => (
                  <button
                    key={n}
                    onClick={() => setTotalRounds(n)}
                    className={`h-9 w-9 rounded-lg text-sm font-medium transition-all ${
                      totalRounds === n
                        ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20"
                        : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected topic preview */}
          {topic && (
            <div className="mt-6 rounded-xl border border-white/10 bg-[#091320]/78 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/38">Selected Topic</p>
              <p className="mt-1.5 text-sm leading-5 text-white/88">&quot;{topic}&quot;</p>
            </div>
          )}

          {/* Start button */}
          <div className="mt-8 flex justify-between">
            <button
              onClick={() => router.push("/setup/agents")}
              className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white/68 hover:border-white/20 hover:text-white"
            >
              Back
            </button>
            <button
              onClick={handleStart}
              disabled={!topic}
              className="rounded-2xl border border-cyan-300/30 bg-cyan-400/12 px-8 py-3 text-sm font-semibold text-cyan-50 shadow-[0_0_32px_rgba(22,213,255,0.14)] hover:-translate-y-0.5 hover:bg-cyan-400/16 disabled:cursor-not-allowed disabled:opacity-30 flex items-center gap-2"
            >
              🚀 Start {isMentor ? "Session" : "Discussion"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
