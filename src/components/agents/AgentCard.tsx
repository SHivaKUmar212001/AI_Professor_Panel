"use client";

import { Agent } from "@/lib/types";
import { motion } from "framer-motion";
import { useState, type FocusEvent } from "react";
import RobotPortrait from "@/components/avatars/RobotPortrait";

interface AgentCardProps {
  agent: Agent;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export default function AgentCard({
  agent,
  selected,
  onToggle,
  disabled,
}: AgentCardProps) {
  const tooltipId = `agent-card-details-${agent.id}`;
  const hoverDescription = `${agent.title}. ${agent.reasoningStyle} Signature move: ${agent.signatureMove} Expertise: ${agent.expertise.join(
    ", "
  )}.`;
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  const handleFocus = (event: FocusEvent<HTMLButtonElement>) => {
    setIsTooltipVisible(event.currentTarget.matches(":focus-visible"));
  };

  return (
    <div className="relative flex h-full justify-center">
      <motion.button
        whileHover={{ y: -2, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onToggle}
        onPointerEnter={() => setIsTooltipVisible(true)}
        onPointerLeave={() => setIsTooltipVisible(false)}
        onFocus={handleFocus}
        onBlur={() => setIsTooltipVisible(false)}
        disabled={disabled && !selected}
        aria-describedby={isTooltipVisible ? tooltipId : undefined}
        title={hoverDescription}
        className={`group flex w-full max-w-[8rem] flex-col items-center gap-2 rounded-[22px] px-2 py-2 text-center transition-all duration-200 ${
          disabled && !selected
            ? "cursor-not-allowed opacity-40"
            : "hover:bg-white/[0.03]"
        }`}
      >
        <div className="relative">
          <RobotPortrait
            name={agent.name}
            color={agent.color}
            emoji={agent.emoji}
            size="card"
            state={selected ? "listening" : "idle"}
            highlighted={selected}
          />
          {selected && (
            <span
              className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-black"
              style={{ backgroundColor: agent.color }}
            >
              ✓
            </span>
          )}
        </div>

        <div className="space-y-1">
          <p className="line-clamp-2 text-xs font-semibold leading-4 text-white sm:text-sm">
            {agent.name}
          </p>
          <p className="line-clamp-2 text-[10px] leading-4 text-white/34 sm:text-[11px]">
            {agent.title}
          </p>
        </div>
      </motion.button>

      <div
        id={tooltipId}
        role="tooltip"
        aria-hidden={!isTooltipVisible}
        className={`pointer-events-none absolute left-1/2 top-full z-30 mt-3 w-[15rem] -translate-x-1/2 rounded-2xl border border-white/15 bg-[#101726]/96 p-4 text-left shadow-2xl shadow-black/40 transition-all duration-200 ${
          isTooltipVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
            style={{ backgroundColor: `${agent.color}22`, color: agent.color }}
          >
            {agent.emoji}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/35">
              Full Profile
            </p>
            <h4 className="mt-1 text-sm font-semibold text-white">
              {agent.name}
            </h4>
            <p className="text-xs text-white/50">{agent.title}</p>
          </div>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-white/75">
          {agent.reasoningStyle}
        </p>

        <p className="mt-3 text-xs italic leading-relaxed text-white/55">
          &quot;{agent.signatureMove}&quot;
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {agent.expertise.map((item) => (
            <span
              key={item}
              className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/60"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
