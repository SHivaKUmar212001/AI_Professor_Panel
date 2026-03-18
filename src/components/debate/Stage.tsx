"use client";

import { moderatorAgent } from "@/lib/agents";
import { Agent, AvatarState } from "@/lib/types";
import Avatar from "./Avatar";

interface StageProps {
  agents: Agent[];
  avatarStates: Record<string, AvatarState>;
  currentSpeaker: string | null;
  streamingText: string;
  speakerName?: string;
  speakerEmoji?: string;
  speakerColor?: string;
}

export default function Stage({
  agents,
  avatarStates,
  currentSpeaker,
  streamingText,
  speakerName,
  speakerEmoji,
  speakerColor,
}: StageProps) {
  const splitIndex = Math.ceil(agents.length / 2);
  const leftAgents = agents.slice(0, splitIndex);
  const rightAgents = agents.slice(splitIndex);
  const spotlightColor =
    agents.find((agent) => agent.id === currentSpeaker)?.color ||
    (currentSpeaker === moderatorAgent.id ? moderatorAgent.color : "#67f3ff");

  return (
    <div className="relative rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,28,0.95),rgba(5,10,20,0.98))] p-4 sm:p-6">
      <div className="absolute inset-0 overflow-hidden rounded-[24px] pointer-events-none">
        {currentSpeaker && (
          <div
            className="absolute left-1/2 top-0 h-44 w-44 -translate-x-1/2 rounded-full opacity-20 blur-3xl"
            style={{ backgroundColor: spotlightColor }}
          />
        )}
        <div className="absolute bottom-0 left-[8%] right-[8%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <div className="relative mb-5 flex flex-col items-center gap-3">
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/30">
          Council Chamber
        </span>

        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-4">
          <Avatar
            emoji={moderatorAgent.emoji}
            name={moderatorAgent.name}
            color={moderatorAgent.color}
            state={avatarStates[moderatorAgent.id] || "idle"}
          />
        </div>
      </div>

      <div className="relative mt-2 flex items-start justify-between gap-6 py-2">
        <div className="flex min-h-[11rem] flex-1 flex-col items-start justify-center gap-4">
          {leftAgents.map((agent) => (
            <Avatar
              key={agent.id}
              emoji={agent.emoji}
              name={agent.name}
              color={agent.color}
              state={avatarStates[agent.id] || "idle"}
            />
          ))}
        </div>

        <div className="hidden self-stretch md:block">
          <div className="h-full w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
        </div>

        <div className="flex min-h-[11rem] flex-1 flex-col items-end justify-center gap-4">
          {rightAgents.map((agent) => (
            <Avatar
              key={agent.id}
              emoji={agent.emoji}
              name={agent.name}
              color={agent.color}
              state={avatarStates[agent.id] || "idle"}
            />
          ))}
        </div>
      </div>

      {currentSpeaker && (streamingText || speakerName) ? (
        <div
          className="relative mt-5 rounded-[20px] border px-4 py-4"
          style={{
            borderColor: `${speakerColor || "#67f3ff"}30`,
            background: "linear-gradient(180deg, rgba(17,25,39,0.98), rgba(11,18,30,0.98))",
          }}
        >
          <div
            className="absolute inset-x-0 top-0 h-px"
            style={{
              background: `linear-gradient(90deg, transparent, ${speakerColor || "#67f3ff"}, transparent)`,
            }}
          />
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-sm">{speakerEmoji}</span>
            <span className="text-sm font-semibold" style={{ color: speakerColor }}>
              {speakerName}
            </span>
          </div>
          {streamingText ? (
            <p className="whitespace-pre-wrap text-sm leading-6 text-white/80">
              {streamingText}
            </p>
          ) : (
            <div className="flex items-center gap-1.5 py-1">
              {[0, 1, 2].map((index) => (
                <span
                  key={index}
                  className="h-1.5 w-1.5 animate-pulse rounded-full"
                  style={{
                    backgroundColor: speakerColor,
                    animationDelay: `${index * 200}ms`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-5 rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-4 text-center">
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/32">
            Moderator Feed
          </p>
          <p className="mt-2 text-sm leading-6 text-white/52">
            The moderator opens the room, keeps the tone disciplined, and redirects the council whenever the exchange starts to drift.
          </p>
        </div>
      )}
    </div>
  );
}
