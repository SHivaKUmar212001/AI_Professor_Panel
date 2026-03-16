"use client";

import { agents, getAgentsByCategory } from "@/lib/agents";
import { useDiscussionStore } from "@/stores/discussion-store";
import AgentCard from "./AgentCard";

export default function AgentSelector() {
  const selectedAgents = useDiscussionStore((s) => s.selectedAgents);
  const toggleAgent = useDiscussionStore((s) => s.toggleAgent);
  const grouped = getAgentsByCategory();
  const maxAgents = 5;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Assemble Your Panel
          </h2>
          <p className="mt-1 text-sm text-white/50">
            Choose 2-5 intellectual agents for your discussion
          </p>
        </div>
        <div
          className={`w-fit rounded-full px-3 py-1.5 text-sm font-mono ${
            selectedAgents.length >= 2
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-white/5 text-white/40"
          }`}
        >
          {selectedAgents.length}/{maxAgents} selected
        </div>
      </div>

      {Object.entries(grouped).map(([category, categoryAgents]) => (
        <div key={category} className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/46">
            {category}
          </h3>
          <div className="grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-4 sm:gap-x-3 lg:grid-cols-5 xl:grid-cols-6">
            {categoryAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                selected={selectedAgents.includes(agent.id)}
                onToggle={() => toggleAgent(agent.id)}
                disabled={
                  selectedAgents.length >= maxAgents &&
                  !selectedAgents.includes(agent.id)
                }
              />
            ))}
          </div>
        </div>
      ))}

      {/* Selected panel strip */}
      {selectedAgents.length > 0 && (
        <div className="sticky bottom-4 rounded-2xl border border-white/10 bg-[#0B0F1A]/90 p-3 backdrop-blur-md">
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
                  <span className="text-white/80">
                    {agent.name.split(" ").pop()}
                  </span>
                  <span className="ml-1 text-white/30 group-hover:text-red-400">
                    ×
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
