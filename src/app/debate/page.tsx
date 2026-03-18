"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDiscussionStore } from "@/stores/discussion-store";
import { agents as allAgents, moderatorAgent } from "@/lib/agents";
import { AvatarState } from "@/lib/types";
import Header from "@/components/layout/Header";
import Stage from "@/components/debate/Stage";
import DiscussionSummaryPanel from "@/components/discussion/DiscussionSummary";

interface StageTurn {
  id: string;
  name: string;
  color: string;
  emoji: string;
  text: string;
}

function getVoiceSeed(label?: string) {
  const safeLabel =
    typeof label === "string" && label.trim().length > 0
      ? label
      : "Cortex Council";

  return Array.from(safeLabel).reduce(
    (total, char, index) => total + char.charCodeAt(0) * (index + 3),
    0
  );
}

export default function DebatePage() {
  const router = useRouter();
  const { status: authStatus } = useSession();
  const store = useDiscussionStore();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedRef = useRef(false);
  const speechRequestRef = useRef(0);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioFetchRef = useRef<AbortController | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const [userInput, setUserInput] = useState("");
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [activeTurn, setActiveTurn] = useState<StageTurn | null>(null);

  const panelAgents = store.selectedAgents
    .map((id) => allAgents.find((a) => a.id === id))
    .filter((a): a is (typeof allAgents)[number] => a !== undefined);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.replace("/login");
    if (store.appMode !== "debate") router.replace("/");
  }, [authStatus, store.appMode, router]);

  const finishSpeakerTurn = useCallback((agentId: string) => {
    const state = useDiscussionStore.getState();

    if (state.currentAgent?.id === agentId) {
      state.setCurrentAgent(null);
    }

    state.setAvatarState(agentId, "idle");
  }, []);

  const clearAudioUrl = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  const stopSpeech = useCallback(() => {
    speechRequestRef.current += 1;
    audioFetchRef.current?.abort();
    audioFetchRef.current = null;

    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.onended = null;
      audioElementRef.current.onerror = null;
      audioElementRef.current.src = "";
      audioElementRef.current = null;
    }

    clearAudioUrl();
  }, [clearAudioUrl]);

  const closeStream = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    stopSpeech();
  }, [stopSpeech]);

  const setAllAvatars = useCallback((state: AvatarState, except?: string) => {
    const ids = [...useDiscussionStore.getState().selectedAgents, moderatorAgent.id];
    for (const id of ids) {
      if (id !== except) {
        useDiscussionStore.getState().setAvatarState(id, state);
      }
    }
  }, []);

  const speakTurn = useCallback(
    async (speaker: Pick<StageTurn, "id" | "name">, text: string) => {
      if (!text.trim()) {
        finishSpeakerTurn(speaker.id);
        return;
      }

      const requestId = speechRequestRef.current + 1;
      stopSpeech();
      speechRequestRef.current = requestId;

      if (!voiceEnabled) {
        finishSpeakerTurn(speaker.id);
        return;
      }

      const controller = new AbortController();
      audioFetchRef.current = controller;

      try {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            agentId: speaker.id,
            agentName: speaker.name,
            voiceSeed: getVoiceSeed(speaker.name),
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          let errorMessage = "Voice generation failed.";

          try {
            const data = (await response.json()) as { error?: string };
            if (typeof data?.error === "string" && data.error.trim().length > 0) {
              errorMessage = data.error;
            }
          } catch {
            // Fall back to the generic message if the error payload isn't JSON.
          }

          throw new Error(errorMessage);
        }

        const audioBlob = await response.blob();
        if (speechRequestRef.current !== requestId) {
          return;
        }

        audioFetchRef.current = null;
        clearAudioUrl();

        const audio = new Audio(URL.createObjectURL(audioBlob));
        audio.preload = "auto";
        audioUrlRef.current = audio.src;
        audioElementRef.current = audio;

        audio.onended = () => {
          if (speechRequestRef.current === requestId) {
            audioElementRef.current = null;
            clearAudioUrl();
            finishSpeakerTurn(speaker.id);
          }
        };

        audio.onerror = () => {
          if (speechRequestRef.current === requestId) {
            audioElementRef.current = null;
            clearAudioUrl();
            finishSpeakerTurn(speaker.id);
            useDiscussionStore.getState().setError(
              "Voice playback failed for this debate turn."
            );
          }
        };

        await audio.play();
      } catch (error) {
        if (
          error instanceof Error &&
          (error.name === "AbortError" || controller.signal.aborted)
        ) {
          return;
        }

        if (speechRequestRef.current === requestId) {
          finishSpeakerTurn(speaker.id);
          useDiscussionStore.getState().setError(
            error instanceof Error && error.message
              ? error.message
              : "Voice playback is unavailable right now."
          );
        }
      }
    },
    [clearAudioUrl, finishSpeakerTurn, stopSpeech, voiceEnabled]
  );

  const connectToStream = useCallback((sessionId: string) => {
    closeStream();
    setActiveTurn(null);

    const es = new EventSource(`/api/discussion/stream?sessionId=${sessionId}`);
    eventSourceRef.current = es;

    es.addEventListener("round_start", (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      useDiscussionStore.getState().setCurrentRound(data.round);
    });

    es.addEventListener("turn_start", (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      const state = useDiscussionStore.getState();
      stopSpeech();
      setActiveTurn(null);
      state.setCurrentAgent({
        id: data.agentId,
        name: data.agentName,
        color: data.agentColor,
        emoji: data.agentEmoji,
      });
      state.setAvatarState(data.agentId, "thinking");
      setAllAvatars("listening", data.agentId);
    });

    es.addEventListener("token", () => {});

    es.addEventListener("turn_end", (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      const agent =
        allAgents.find((item) => item.id === data.agentId) ??
        (data.agentId === moderatorAgent.id ? moderatorAgent : undefined);
      const state = useDiscussionStore.getState();

      if (agent) {
        state.addMessage({
          id: data.messageId ?? `msg_${data.round}_${agent.id}`,
          agentId: agent.id,
          agentName: agent.name,
          agentColor: agent.color,
          agentEmoji: agent.emoji,
          text: data.fullText,
          round: data.round,
          turnInRound: state.messages.length + 1,
          timestamp: Date.now(),
        });
      }
      const completedTurn = {
        id: data.agentId,
        name: data.agentName ?? agent?.name ?? "Council Speaker",
        color: data.agentColor ?? agent?.color ?? "#67f3ff",
        emoji: data.agentEmoji ?? agent?.emoji ?? "🎙️",
        text: data.fullText,
      };

      setActiveTurn(completedTurn);
      state.setCurrentAgent({
        id: completedTurn.id,
        name: completedTurn.name,
        color: completedTurn.color,
        emoji: completedTurn.emoji,
      });
      state.setAvatarState(data.agentId, "speaking");
      setAllAvatars("idle", data.agentId);
      void speakTurn(completedTurn, data.fullText);
    });

    es.addEventListener("discussion_end", () => {
      const state = useDiscussionStore.getState();
      state.setStatus("completed");
      state.setCurrentAgent(null);
      setAllAvatars("idle");
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (eventSourceRef.current === es) {
        eventSourceRef.current = null;
      }
      es.close();
    });

    es.addEventListener("error", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data);
        useDiscussionStore.getState().setError(data.message);
      } catch {
        // connection error
      }
    });

    es.onerror = () => {
      const state = useDiscussionStore.getState();
      if (eventSourceRef.current === es) eventSourceRef.current = null;
      es.close();

      if (state.status === "running" && state.sessionId) {
        state.setError("Connection interrupted. Reconnecting...");
        reconnectTimerRef.current = setTimeout(() => {
          const latest = useDiscussionStore.getState();
          if (latest.status === "running" && latest.sessionId) {
            connectToStream(latest.sessionId);
          }
        }, 1200);
      }
    };
  }, [closeStream, setAllAvatars, speakTurn, stopSpeech]);

  const startDiscussion = useCallback(async () => {
    const state = useDiscussionStore.getState();
    try {
      state.setStatus("running");
      state.setError(null);

      const res = await fetch("/api/discussion/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentIds: state.selectedAgents,
          topicPrompt: state.topic,
          totalRounds: state.totalRounds,
          turnOrder: "rotate",
          discussionMode: state.discussionMode,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start");
      }

      const { sessionId } = await res.json();
      state.setSessionId(sessionId);
    } catch (err) {
      state.setStatus("error");
      state.setError(err instanceof Error ? err.message : "Failed to start");
    }
  }, []);

  // Auto-start and connect
  useEffect(() => {
    if (store.status !== "running") return;
    if (store.sessionId) {
      connectToStream(store.sessionId);
      return;
    }
    if (!startedRef.current) {
      startedRef.current = true;
      void startDiscussion();
    }
  }, [connectToStream, startDiscussion, store.sessionId, store.status]);

  useEffect(() => () => { closeStream(); }, [closeStream]);

  const stopDiscussion = async () => {
    if (store.sessionId) {
      await fetch("/api/discussion/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: store.sessionId }),
      });
    }
    closeStream();
    store.setStatus("completed");
    store.setCurrentAgent(null);
    setAllAvatars("idle");
  };

  const sendUserMessage = async () => {
    if (!userInput.trim() || !store.sessionId) return;
    const text = userInput.trim();
    setUserInput("");
    await fetch("/api/discussion/intervene", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: store.sessionId, userMessage: text }),
    });
  };

  const generateSummary = async () => {
    if (store.messages.length === 0) return;

    if (store.summary) {
      setSummaryOpen(true);
      return;
    }

    setGeneratingSummary(true);
    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: store.messages.filter(
            (message) =>
              message.agentId !== "__user__" &&
              message.agentId !== moderatorAgent.id
          ),
        }),
      });
      const data = await res.json();
      if (data.summary) {
        store.setSummary(data.summary);
        setSummaryOpen(true);
      }
    } catch {
      store.setError("Failed to generate summary");
    } finally {
      setGeneratingSummary(false);
    }
  };

  const exportMarkdown = () => {
    if (store.messages.length === 0) return;

    const discussionModeLabel =
      store.discussionMode === "academic" ? "Academic seminar" : "Student-friendly";
    const lines = [
      "# Cortex Council Debate",
      "",
      `## Topic: ${store.topic}`,
      `### Style: ${discussionModeLabel}`,
      `### Moderator: ${moderatorAgent.name}`,
      `### Panel: ${panelAgents.map((agent) => agent.name).join(" | ")}`,
      `### Rounds: ${store.totalRounds}`,
      "",
      "---",
      "",
    ];

    let lastRound = 0;
    for (const message of store.messages) {
      if (message.round !== lastRound) {
        lines.push(`## Round ${message.round}`, "");
        lastRound = message.round;
      }

      lines.push(
        `**${message.agentEmoji} ${message.agentName}:**`,
        "",
        message.text,
        ""
      );
    }

    if (store.summary) {
      lines.push("---", "", "## Discussion Analysis", "", `**Verdict:** ${store.summary.verdict}`, "");
    }

    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cortex-council-debate-${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    closeStream();
    useDiscussionStore.getState().reset();
    router.push("/");
  };

  if (store.appMode !== "debate") return null;

  return (
    <div className="flex h-screen flex-col">
      <Header />

      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0B0F1A]/55 px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white/50">
            🎭 Debate
          </span>
          {store.status === "running" && (
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-mono text-emerald-300">
              Round {store.currentRound}/{store.totalRounds}
            </span>
          )}
          {store.status === "completed" && (
            <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-sm font-mono text-cyan-300">
              Completed
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (voiceEnabled) {
                stopSpeech();
              }
              setVoiceEnabled((enabled) => !enabled);
            }}
            className={`rounded-xl border px-3 py-2 text-sm ${
              voiceEnabled
                ? "border-cyan-300/25 bg-cyan-400/12 text-cyan-100"
                : "border-white/10 bg-white/5 text-white/55"
            }`}
          >
            {voiceEnabled ? "Voice narration on" : "Voice narration off"}
          </button>
          <button
            onClick={exportMarkdown}
            disabled={store.messages.length === 0}
            className="rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-400/18 disabled:cursor-not-allowed disabled:opacity-35"
          >
            Export MD
          </button>
          <button
            onClick={generateSummary}
            disabled={store.messages.length === 0 || generatingSummary}
            className="rounded-xl border border-purple-400/20 bg-purple-500/12 px-3 py-2 text-sm text-purple-200 hover:bg-purple-500/20 disabled:cursor-not-allowed disabled:opacity-35"
          >
            {generatingSummary
              ? "Generating..."
              : store.summary
                ? "View Summary"
                : "Generate Summary"}
          </button>
          {store.status === "running" && (
            <button
              onClick={stopDiscussion}
              className="rounded-xl border border-red-500/30 bg-red-500/20 px-3 py-2 text-sm text-red-300 hover:bg-red-500/30"
            >
              ■ Stop
            </button>
          )}
          {store.status === "completed" && (
            <button
              onClick={handleReset}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/60 hover:border-white/20 hover:text-white"
            >
              ← New Setup
            </button>
          )}
        </div>
      </div>

      {/* Topic bar */}
      <div className="border-b border-white/5 px-4 py-2 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm italic text-white/40">&quot;{store.topic}&quot;</p>
          <span className="rounded-full border border-indigo-300/20 bg-indigo-400/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-indigo-100/75">
            Moderator active
          </span>
        </div>
      </div>

      {/* Main content: Stage only */}
      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-5xl space-y-5">
          {store.error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {store.error}
            </div>
          )}

          {/* The Stage */}
          <Stage
            agents={panelAgents}
            avatarStates={store.avatarStates}
            currentSpeaker={store.currentAgent?.id || activeTurn?.id || null}
            streamingText={activeTurn?.text || ""}
            speakerName={store.currentAgent?.name || activeTurn?.name}
            speakerEmoji={store.currentAgent?.emoji || activeTurn?.emoji}
            speakerColor={store.currentAgent?.color || activeTurn?.color}
          />
        </div>
      </div>

      {/* User intervention */}
      {store.status === "running" && (
        <div className="border-t border-white/10 bg-[#0B0F1A]/72 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="mx-auto flex max-w-5xl gap-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendUserMessage()}
              placeholder="💬 Join the debate..."
              className="flex-1 rounded-[18px] border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
            />
            <button
              onClick={sendUserMessage}
              disabled={!userInput.trim()}
              className="rounded-[18px] border border-emerald-300/20 bg-emerald-400/12 px-4 py-2.5 text-sm font-medium text-emerald-100 hover:bg-emerald-400/20 disabled:opacity-30"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {summaryOpen && store.summary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020611]/82 px-4 py-6 backdrop-blur-md">
          <div className="w-full max-w-3xl rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,16,28,0.98),rgba(6,12,22,0.99))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-200/55">
                  Debate Summary
                </p>
                <h2 className="mt-1 text-xl font-semibold text-white">
                  Council Debrief
                </h2>
              </div>
              <button
                onClick={() => setSummaryOpen(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/65 hover:border-white/20 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto pr-1">
              <DiscussionSummaryPanel summary={store.summary} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
