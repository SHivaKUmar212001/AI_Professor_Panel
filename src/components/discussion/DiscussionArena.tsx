"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDiscussionStore } from "@/stores/discussion-store";
import { agents as allAgents } from "@/lib/agents";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import DiscussionSummaryPanel from "./DiscussionSummary";
import { AnimatePresence } from "framer-motion";

function getEventId(event: MessageEvent) {
  const value = Number(event.lastEventId);
  return Number.isNaN(value) ? null : value;
}

export default function DiscussionArena() {
  const store = useDiscussionStore();
  const chatRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEventIdRef = useRef(store.lastEventId);
  const startedRef = useRef(false);
  const [userInput, setUserInput] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const discussionModeLabel =
    store.discussionMode === "student" ? "Student-friendly" : "Academic";
  const hasMessages = store.messages.length > 0;

  const rememberEvent = useCallback((event: MessageEvent) => {
    const eventId = getEventId(event);
    if (eventId !== null) {
      useDiscussionStore.getState().setLastEventId(eventId);
    }
  }, []);

  const closeStream = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    eventSourceRef.current?.close();
    eventSourceRef.current = null;
  }, []);

  const connectToStream = useCallback(
    (sessionId: string, lastEventId: number) => {
      closeStream();
      useDiscussionStore.getState().clearStreamingText();

      const params = new URLSearchParams({
        sessionId,
        lastEventId: String(lastEventId),
      });
      const es = new EventSource(`/api/discussion/stream?${params.toString()}`);
      eventSourceRef.current = es;

      es.onopen = () => {
        useDiscussionStore.getState().setError(null);
      };

      es.addEventListener("discussion_start", (event) => {
        const messageEvent = event as MessageEvent;
        rememberEvent(messageEvent);
        const data = JSON.parse(messageEvent.data);
        useDiscussionStore.getState().setSessionId(data.sessionId);
      });

      es.addEventListener("round_start", (event) => {
        const messageEvent = event as MessageEvent;
        rememberEvent(messageEvent);
        const data = JSON.parse(messageEvent.data);
        const state = useDiscussionStore.getState();
        state.setCurrentRound(data.round);
        state.clearStreamingText();
      });

      es.addEventListener("turn_start", (event) => {
        const messageEvent = event as MessageEvent;
        rememberEvent(messageEvent);
        const data = JSON.parse(messageEvent.data);
        const state = useDiscussionStore.getState();
        state.clearStreamingText();
        state.setCurrentAgent({
          id: data.agentId,
          name: data.agentName,
          color: data.agentColor,
          emoji: data.agentEmoji,
        });
      });

      es.addEventListener("token", (event) => {
        const messageEvent = event as MessageEvent;
        rememberEvent(messageEvent);
      });

      es.addEventListener("user_message", (event) => {
        const messageEvent = event as MessageEvent;
        rememberEvent(messageEvent);
        const data = JSON.parse(messageEvent.data);
        useDiscussionStore.getState().addMessage(data);
      });

      es.addEventListener("turn_end", (event) => {
        const messageEvent = event as MessageEvent;
        rememberEvent(messageEvent);
        const data = JSON.parse(messageEvent.data);
        const agent = allAgents.find((item) => item.id === data.agentId);
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

        state.clearStreamingText();
        state.setCurrentAgent(null);
      });

      es.addEventListener("discussion_end", (event) => {
        const messageEvent = event as MessageEvent;
        rememberEvent(messageEvent);
        const state = useDiscussionStore.getState();
        state.setStatus("completed");
        state.setCurrentAgent(null);
        state.clearStreamingText();
        closeStream();
      });

      es.addEventListener("error", (event) => {
        const messageEvent = event as MessageEvent;
        rememberEvent(messageEvent);
        const data = JSON.parse(messageEvent.data);
        useDiscussionStore.getState().setError(data.message);
      });

      es.onerror = () => {
        const state = useDiscussionStore.getState();

        if (eventSourceRef.current === es) {
          eventSourceRef.current = null;
        }

        es.close();

        if (state.status === "running" && state.sessionId) {
          state.setError("Live connection interrupted. Reconnecting...");

          reconnectTimerRef.current = setTimeout(() => {
            const latestState = useDiscussionStore.getState();
            if (latestState.status === "running" && latestState.sessionId) {
              connectToStream(latestState.sessionId, latestState.lastEventId);
            }
          }, 1200);
        }
      };
    },
    [closeStream, rememberEvent]
  );

  const startDiscussion = useCallback(async () => {
    const state = useDiscussionStore.getState();

    try {
      state.setStatus("running");
      state.setError(null);
      state.setSummary(null);
      state.setCurrentRound(0);
      state.setCurrentAgent(null);
      state.clearStreamingText();
      state.setLastEventId(-1);

      const startRes = await fetch("/api/discussion/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentIds: state.selectedAgents,
          topicPrompt: state.topic,
          totalRounds: state.totalRounds,
          turnOrder: "rotate",
          discussionMode: state.discussionMode,
          referenceDiscussion: state.referenceDiscussion,
        }),
      });

      if (!startRes.ok) {
        const err = await startRes.json();
        throw new Error(err.error || "Failed to start");
      }

      const { sessionId } = await startRes.json();
      state.setSessionId(sessionId);
    } catch (err) {
      state.setStatus("error");
      state.setError(
        err instanceof Error ? err.message : "Failed to start discussion"
      );
    }
  }, []);

  useEffect(() => {
    lastEventIdRef.current = store.lastEventId;
  }, [store.lastEventId]);

  useEffect(() => {
    if (store.status !== "running") {
      return;
    }

    if (store.sessionId) {
      connectToStream(store.sessionId, lastEventIdRef.current);
      return;
    }

    if (!startedRef.current) {
      startedRef.current = true;
      void startDiscussion();
    }
  }, [
    connectToStream,
    startDiscussion,
    store.sessionId,
    store.status,
  ]);

  useEffect(() => {
    return () => {
      closeStream();
    };
  }, [closeStream]);

  useEffect(() => {
    if (autoScroll && chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [store.messages, store.currentAgent, autoScroll]);

  const handleScroll = useCallback(() => {
    if (!chatRef.current) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = chatRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 100;
    setAutoScroll(atBottom);
  }, []);

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
    store.clearStreamingText();
  };

  const sendUserMessage = async () => {
    if (!userInput.trim() || !store.sessionId) {
      return;
    }

    const text = userInput.trim();
    setUserInput("");

    try {
      const res = await fetch("/api/discussion/intervene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: store.sessionId,
          userMessage: text,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to inject message");
      }
    } catch (error) {
      store.setError(
        error instanceof Error ? error.message : "Failed to join discussion"
      );
    }
  };

  const generateSummary = async () => {
    if (!hasMessages) {
      return;
    }

    setGeneratingSummary(true);
    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: store.messages.filter((message) => message.agentId !== "__user__"),
        }),
      });
      const data = await res.json();
      if (data.summary) {
        store.setSummary(data.summary);
      }
    } catch {
      store.setError("Failed to generate summary");
    } finally {
      setGeneratingSummary(false);
    }
  };

  const exportMarkdown = () => {
    const lines = [
      "# Cortex Council Discussion",
      `## Topic: ${store.topic}`,
      `### Style: ${discussionModeLabel}`,
      `### Panel: ${store.selectedAgents
        .map((id) => allAgents.find((agent) => agent.id === id)?.name)
        .join(" | ")}`,
      `### Rounds: ${store.totalRounds}`,
      ...(store.referenceDiscussion
        ? [`### Prior Context: ${store.referenceDiscussion.fileName}`]
        : []),
      "",
      "---",
      "",
    ];

    let lastRound = 0;
    for (const msg of store.messages) {
      if (msg.round !== lastRound) {
        lines.push(`## Round ${msg.round}`, "");
        lastRound = msg.round;
      }
      lines.push(`**${msg.agentEmoji} ${msg.agentName}:**`, "", msg.text, "");
    }

    if (store.summary) {
      lines.push("---", "", "## Discussion Analysis", "");
      lines.push(`**Verdict:** ${store.summary.verdict}`, "");
    }

    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cortex-council-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const data = {
      topic: store.topic,
      discussionMode: store.discussionMode,
      referenceDiscussion: store.referenceDiscussion,
      agents: store.selectedAgents,
      totalRounds: store.totalRounds,
      messages: store.messages,
      summary: store.summary,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cortex-council-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetAll = () => {
    closeStream();
    useDiscussionStore.getState().reset();
  };

  const panelAgents = store.selectedAgents
    .map((id) => allAgents.find((agent) => agent.id === id))
    .filter(Boolean);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0B0F1A]/55 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5 sm:gap-3">
          {store.status === "running" && (
            <span className="shrink-0 rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-mono text-emerald-300">
              Round {store.currentRound}/{store.totalRounds}
            </span>
          )}
          {store.status === "completed" && (
            <span className="shrink-0 rounded-full bg-cyan-500/20 px-3 py-1 text-sm font-mono text-cyan-300">
              Completed
            </span>
          )}
          <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-mono text-white/60">
            {discussionModeLabel}
          </span>
          {store.referenceDiscussion && (
            <span className="shrink-0 rounded-full border border-amber-300/15 bg-amber-400/10 px-3 py-1 text-sm font-mono text-amber-100">
              Context: {store.referenceDiscussion.fileName}
            </span>
          )}
          <div className="flex items-center gap-2 overflow-x-auto">
            {panelAgents.map(
              (agent) =>
                agent && (
                  <span
                    key={agent.id}
                    className="whitespace-nowrap text-xs"
                    style={{ color: agent.color }}
                  >
                    {agent.emoji} {agent.name.split(" ").pop()}
                  </span>
                )
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {(store.status === "idle" || store.status === "setup") && (
            <button
              onClick={startDiscussion}
              disabled={store.selectedAgents.length < 2 || !store.topic}
              className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Start Discussion
            </button>
          )}
          {store.status === "running" && (
            <button
              onClick={stopDiscussion}
              className="rounded-xl border border-red-500/30 bg-red-500/20 px-4 py-2 text-sm font-medium text-red-300 transition-all hover:bg-red-500/30"
            >
              Stop
            </button>
          )}
        </div>
      </div>

      <div className="border-b border-white/5 bg-[linear-gradient(90deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] px-4 py-2.5 sm:px-6">
        <p className="text-sm italic text-white/52 whitespace-normal break-words">
          &quot;{store.topic}&quot;
        </p>
      </div>

      {(store.status === "completed" || store.status === "error") && (
        <div className="border-b border-white/10 bg-[#0D1521]/75 px-4 py-3 backdrop-blur-sm sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/55">
                Discussion Tools
              </p>
              <p className="mt-1 text-sm text-white/46">
                Export this panel, inspect the transcript, or start a fresh run.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {store.status === "completed" && (
                <button
                  onClick={generateSummary}
                  disabled={generatingSummary}
                  className="rounded-xl border border-purple-400/20 bg-purple-500/12 px-3.5 py-2 text-sm font-medium text-purple-200 transition-all hover:bg-purple-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generatingSummary ? "Analyzing..." : "Generate Summary"}
                </button>
              )}
              {hasMessages && (
                <button
                  onClick={exportMarkdown}
                  className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3.5 py-2 text-sm font-medium text-cyan-100 transition-all hover:bg-cyan-500/18"
                >
                  Export MD
                </button>
              )}
              {hasMessages && (
                <button
                  onClick={exportJSON}
                  className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm font-medium text-white/72 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
                >
                  Export JSON
                </button>
              )}
              <button
                onClick={resetAll}
                className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm font-medium text-white/72 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                New Discussion
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        ref={chatRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(27,47,73,0.24),transparent_48%),linear-gradient(180deg,#08111b_0%,#09101a_40%,#070d15_100%)] px-4 py-5 sm:px-6"
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-4">
          {store.error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {store.error}
            </div>
          )}

          {!hasMessages && store.status !== "running" && !store.error && (
            <div className="flex min-h-[16rem] items-center justify-center rounded-[28px] border border-dashed border-white/10 bg-white/[0.02] px-6 text-center text-sm leading-7 text-white/30">
              {store.selectedAgents.length >= 2 && store.topic
                ? 'Click "Start Discussion" to begin'
                : "Select agents and a topic to start"}
            </div>
          )}

          {hasMessages && (
            <div className="mb-1 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/55">
                  Discussion Feed
                </p>
                <p className="mt-1 text-sm text-white/42">
                  Panel responses stay on the left. Your interventions appear on
                  the right.
                </p>
              </div>
              {!autoScroll && (
                <button
                  onClick={() => {
                    setAutoScroll(true);
                    if (chatRef.current) {
                      chatRef.current.scrollTop = chatRef.current.scrollHeight;
                    }
                  }}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/58 transition-all hover:border-white/20 hover:text-white"
                >
                  Jump to latest
                </button>
              )}
            </div>
          )}

          {store.messages.map((message) => (
            <MessageBubble
              key={message.id}
              agentName={message.agentName}
              agentEmoji={message.agentEmoji}
              agentColor={message.agentColor}
              text={message.text}
              isUser={message.agentId === "__user__"}
              turnInRound={message.turnInRound}
            />
          ))}

          <AnimatePresence>
            {store.currentAgent && (
              <TypingIndicator
                agentName={store.currentAgent.name}
                agentEmoji={store.currentAgent.emoji}
                agentColor={store.currentAgent.color}
              />
            )}
          </AnimatePresence>

          {store.summary && <DiscussionSummaryPanel summary={store.summary} />}
        </div>
      </div>

      {store.status === "running" && (
        <div className="border-t border-white/10 bg-[#0B0F1A]/72 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                  Join The Panel
                </p>
                <p className="mt-1 text-xs text-white/34">
                  Ask a question or challenge the current direction of the discussion.
                </p>
              </div>
            </div>
            <div className="flex gap-2 rounded-[24px] border border-white/10 bg-white/[0.03] p-2">
              <input
                type="text"
                value={userInput}
                onChange={(event) => setUserInput(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && sendUserMessage()}
                placeholder="Jump in with a question..."
                className="flex-1 rounded-[18px] border border-transparent bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/28 focus:outline-none"
              />
              <button
                onClick={sendUserMessage}
                disabled={!userInput.trim()}
                className="rounded-[18px] border border-emerald-300/20 bg-emerald-400/12 px-4 py-3 text-sm font-medium text-emerald-100 transition-all hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
