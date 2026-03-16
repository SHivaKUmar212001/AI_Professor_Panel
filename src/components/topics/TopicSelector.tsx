"use client";

import { topicCategories } from "@/lib/topics";
import {
  getReferenceDiscussionPreview,
  prepareReferenceDiscussion,
} from "@/lib/discussion-context";
import { DiscussionMode } from "@/lib/types";
import { useDiscussionStore } from "@/stores/discussion-store";
import { agents } from "@/lib/agents";
import { ChangeEvent, useRef, useState } from "react";

const topicAccentStyles = [
  {
    chip: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
    selected: "border-cyan-400/50 bg-cyan-500/20 text-cyan-100 shadow-lg shadow-cyan-500/10",
  },
  {
    chip: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    selected: "border-emerald-400/50 bg-emerald-500/20 text-emerald-100 shadow-lg shadow-emerald-500/10",
  },
  {
    chip: "border-amber-400/20 bg-amber-400/10 text-amber-200",
    selected: "border-amber-400/50 bg-amber-500/20 text-amber-100 shadow-lg shadow-amber-500/10",
  },
  {
    chip: "border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-200",
    selected: "border-fuchsia-400/50 bg-fuchsia-500/20 text-fuchsia-100 shadow-lg shadow-fuchsia-500/10",
  },
];

const discussionModes: {
  id: DiscussionMode;
  label: string;
  description: string;
}[] = [
  {
    id: "student",
    label: "Student-friendly",
    description:
      "More analogies, plain-language explanations, and concrete examples.",
  },
  {
    id: "academic",
    label: "Academic",
    description:
      "More technical language, denser framing, and seminar-style discussion.",
  },
];

export default function TopicSelector() {
  const selectedAgents = useDiscussionStore((s) => s.selectedAgents);
  const topic = useDiscussionStore((s) => s.topic);
  const setTopic = useDiscussionStore((s) => s.setTopic);
  const totalRounds = useDiscussionStore((s) => s.totalRounds);
  const setTotalRounds = useDiscussionStore((s) => s.setTotalRounds);
  const discussionMode = useDiscussionStore((s) => s.discussionMode);
  const setDiscussionMode = useDiscussionStore((s) => s.setDiscussionMode);
  const referenceDiscussion = useDiscussionStore((s) => s.referenceDiscussion);
  const setReferenceDiscussion = useDiscussionStore(
    (s) => s.setReferenceDiscussion
  );
  const [customTopic, setCustomTopic] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCustomTopicSubmit = () => {
    if (customTopic.trim()) {
      setTopic(customTopic.trim());
    }
  };

  const handleReferenceUpload = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!/\.(md|markdown)$/i.test(file.name)) {
      setUploadError("Upload a markdown transcript exported from a discussion.");
      return;
    }

    if (file.size > 1_000_000) {
      setUploadError("That file is too large. Please keep uploads under 1 MB.");
      return;
    }

    try {
      const content = await file.text();
      const prepared = prepareReferenceDiscussion({
        fileName: file.name,
        content,
        uploadedAt: Date.now(),
      });

      if (!prepared) {
        setUploadError("That file is empty or could not be read as context.");
        return;
      }

      setReferenceDiscussion(prepared);
      setUploadError(null);
    } catch {
      setUploadError("The markdown file could not be read. Please try again.");
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4 sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-cyan-200/60">
              Topic Setup
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">
              Choose a discussion prompt
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/48">
              Lead with your own question. The examples are just quick prompts
              for users who want a little inspiration before they start.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-white/45">
                Panel
              </span>
              {selectedAgents.map((id) => {
                const agent = agents.find((a) => a.id === id)!;
                return (
                  <span
                    key={id}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-medium"
                    style={{ color: agent.color }}
                  >
                    {agent.emoji} {agent.name.split(" ").pop()}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="rounded-[22px] border border-cyan-400/15 bg-[linear-gradient(180deg,rgba(13,25,39,0.92),rgba(8,15,24,0.88))] p-3.5 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-white/65">
                  Start With Your Own Question
                </h3>
                <p className="mt-1 text-xs leading-5 text-white/42">
                  Best for a real classroom-style prompt.
                </p>
              </div>
              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-100/80">
                Primary
              </span>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCustomTopicSubmit()}
                placeholder="Type any topic or question..."
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
              />
              <button
                onClick={handleCustomTopicSubmit}
                disabled={!customTopic.trim()}
                className="w-full rounded-xl border border-cyan-500/30 bg-cyan-500/20 px-4 py-2.5 text-sm font-medium text-cyan-300 transition-all hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto sm:min-w-24"
              >
                Set
              </button>
            </div>

            <div className="mt-3 border-t border-white/10 pt-3">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
                    Carry Forward Context
                  </p>
                  <p className="mt-1 text-xs leading-5 text-white/40">
                    Upload a previous discussion markdown file so the next panel
                    can respond with that transcript in mind.
                  </p>
                </div>
                <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:items-end">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md,.markdown,text/markdown"
                    onChange={handleReferenceUpload}
                    className="hidden"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/72 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
                    >
                      {referenceDiscussion ? "Replace MD" : "Upload MD"}
                    </button>
                    {referenceDiscussion && (
                      <button
                        type="button"
                        onClick={() => setReferenceDiscussion(null)}
                        className="rounded-xl border border-white/10 bg-transparent px-3 py-2 text-xs font-medium text-white/48 transition-all hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-200"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {referenceDiscussion ? (
                <div className="mt-3 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06] p-3">
                  <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs font-semibold text-emerald-100">
                      {referenceDiscussion.fileName}
                    </p>
                    <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-emerald-100/80">
                      Context loaded
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-emerald-50/72">
                    {getReferenceDiscussionPreview(referenceDiscussion.content)}
                  </p>
                </div>
              ) : (
                <p className="mt-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-2.5 text-xs leading-5 text-white/36">
                  Optional, but useful when this discussion should build on a
                  previous panel transcript.
                </p>
              )}

              {uploadError && (
                <p className="mt-2 text-xs text-red-300">{uploadError}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
              Example Prompts
            </h3>
            <p className="mt-1 text-xs leading-5 text-white/42 sm:text-sm">
              Compact starter prompts across the main categories.
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/45">
            {topicCategories.length} categories
          </span>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {topicCategories.map((cat, categoryIndex) => {
            const accent =
              topicAccentStyles[categoryIndex % topicAccentStyles.length];

            return (
              <section
                key={cat.name}
                className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-3 sm:p-3.5"
              >
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/72 sm:text-xs">
                    {cat.name}
                  </h4>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] ${accent.chip}`}
                  >
                    2 Examples
                  </span>
                </div>

                <div className="space-y-2">
                  {cat.topics.map((t, topicIndex) => {
                    const isSelected = topic === t.prompt;

                    return (
                      <button
                        key={t.id}
                        onClick={() => setTopic(t.prompt)}
                        aria-pressed={isSelected}
                        className={`group w-full rounded-xl border px-3 py-2.5 text-left transition-all duration-200 ${
                          isSelected
                            ? accent.selected
                            : "border-white/10 bg-white/[0.02] text-white/72 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">
                              Example {topicIndex + 1}
                            </p>
                            <p className="mt-1.5 text-[13px] leading-5 whitespace-normal break-words sm:text-sm sm:leading-5">
                              {t.prompt}
                            </p>
                          </div>
                          <span
                            className={`mt-0.5 shrink-0 rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.16em] transition-colors ${
                              isSelected
                                ? "border-white/20 bg-white/10 text-white/82"
                                : "border-white/10 bg-white/5 text-white/42 group-hover:text-white/68"
                            }`}
                          >
                            {isSelected ? "Selected" : "Use"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <section className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4 sm:p-5">
          <div className="mb-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
              Discussion Style
            </h3>
            <p className="mt-1 text-xs leading-5 text-white/42 sm:text-sm">
              Choose whether the panel sounds more classroom-friendly or more
              like an expert seminar.
            </p>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {discussionModes.map((mode) => {
              const isSelected = discussionMode === mode.id;

              return (
                <button
                  key={mode.id}
                  onClick={() => setDiscussionMode(mode.id)}
                  aria-pressed={isSelected}
                  className={`rounded-xl border px-3.5 py-3 text-left transition-all ${
                    isSelected
                      ? "border-cyan-400/50 bg-cyan-500/15 shadow-lg shadow-cyan-500/10"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`text-sm font-semibold ${
                        isSelected ? "text-cyan-100" : "text-white"
                      }`}
                    >
                      {mode.label}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${
                        isSelected
                          ? "border-cyan-300/30 bg-cyan-400/15 text-cyan-100"
                          : "border-white/10 bg-white/5 text-white/40"
                      }`}
                    >
                      {isSelected ? "Active" : "Select"}
                    </span>
                  </div>
                  <p className="mt-2 text-[13px] leading-5 text-white/55 sm:text-sm">
                    {mode.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
              Rounds
            </h3>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white/42">
              Depth
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
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

          {topic ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-[#091320]/78 p-3.5">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/38">
                Selected Topic
              </p>
              <p className="mt-1.5 text-sm leading-5 text-white/88">
                &quot;{topic}&quot;
              </p>
              <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-white/34">
                Style:{" "}
                <span className="text-white/62">
                  {discussionMode === "student"
                    ? "Student-friendly"
                    : "Academic"}
                </span>
              </p>
              {referenceDiscussion && (
                <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-white/34">
                  Context:{" "}
                  <span className="text-white/62">
                    {referenceDiscussion.fileName}
                  </span>
                </p>
              )}
              <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-white/34">
                Rounds:{" "}
                <span className="text-white/62">
                  {totalRounds} {totalRounds === 1 ? "round" : "rounds"}
                </span>
              </p>
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-3 text-xs leading-5 text-white/40">
              Pick an example or enter your own question above to preview the
              active topic here.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
