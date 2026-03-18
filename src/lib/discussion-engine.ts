import { Agent, DiscussionConfig, DiscussionMessage } from "./types";
import { getAgent, moderatorAgent } from "./agents";
import {
  buildHistoryForAgent,
  buildHistoryForModerator,
} from "./history-builder";
import { streamAgentResponse } from "./anthropic";

type DiscussionEventName =
  | "discussion_start"
  | "round_start"
  | "turn_start"
  | "token"
  | "turn_end"
  | "round_end"
  | "discussion_end"
  | "error"
  | "user_message";

export interface DiscussionStreamEvent {
  id: number;
  event: DiscussionEventName;
  data: unknown;
}

interface QueuedUserMessage {
  afterMessageIndex: number;
  injected: boolean;
  message: DiscussionMessage;
}

type DiscussionSubscriber = (payload: DiscussionStreamEvent) => void;

export class DiscussionEngine {
  private config: DiscussionConfig;
  private agents: Agent[];
  private moderator: Agent;
  private messages: DiscussionMessage[] = [];
  private abortController: AbortController | null = null;
  private stopped = false;
  private sessionId: string;
  private ownerUserId: string;
  private queuedUserMessages: QueuedUserMessage[] = [];
  private subscribers = new Set<DiscussionSubscriber>();
  private eventLog: DiscussionStreamEvent[] = [];
  private nextEventId = 0;
  private runPromise: Promise<void> | null = null;
  private currentRound = 0;
  private status: "ready" | "running" | "completed" | "error" = "ready";

  constructor(config: DiscussionConfig, ownerUserId: string) {
    this.config = config;
    this.ownerUserId = ownerUserId;
    this.sessionId = `disc_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    this.agents = config.agentIds
      .map((id) => getAgent(id))
      .filter((agent): agent is Agent => agent !== undefined);
    this.moderator = moderatorAgent;

    if (this.agents.length < 2) {
      throw new Error("Need at least 2 valid agents");
    }
  }

  start() {
    if (!this.runPromise) {
      this.runPromise = this.run();
    }

    return this.runPromise;
  }

  subscribe(listener: DiscussionSubscriber, afterEventId = -1) {
    for (const payload of this.eventLog) {
      if (payload.id > afterEventId) {
        listener(payload);
      }
    }

    if (this.status !== "completed" && this.status !== "error") {
      this.subscribers.add(listener);
    }

    return () => {
      this.subscribers.delete(listener);
    };
  }

  addUserMessage(text: string) {
    const timestamp = Date.now();
    const round = this.currentRound > 0 ? this.currentRound : 1;
    const message: DiscussionMessage = {
      id: `msg_user_${timestamp}_${Math.random().toString(36).slice(2, 7)}`,
      agentId: "__user__",
      agentName: "You",
      agentColor: "#C8D4F7",
      agentEmoji: "👤",
      text,
      round,
      turnInRound: this.getNextTurnInRound(round),
      timestamp,
    };

    this.queuedUserMessages.push({
      afterMessageIndex: this.messages.length,
      injected: false,
      message,
    });

    this.emit("user_message", message);
  }

  stop() {
    this.stopped = true;
    this.abortController?.abort();
  }

  getSessionId() {
    return this.sessionId;
  }

  getStatus() {
    return this.status;
  }

  isOwnedBy(userId: string) {
    return this.ownerUserId === userId;
  }

  getMessages() {
    return [...this.messages];
  }

  private emit(event: DiscussionEventName, data: unknown) {
    const payload: DiscussionStreamEvent = {
      id: this.nextEventId++,
      event,
      data,
    };

    this.eventLog.push(payload);

    for (const subscriber of this.subscribers) {
      subscriber(payload);
    }
  }

  private getNextTurnInRound(round: number) {
    const liveMessages = this.messages.filter((message) => message.round === round)
      .length;
    const queuedMessages = this.queuedUserMessages.filter(
      (entry) => !entry.injected && entry.message.round === round
    ).length;

    return liveMessages + queuedMessages + 1;
  }

  private flushQueuedUserMessages() {
    let injectedCount = 0;

    for (const entry of this.queuedUserMessages) {
      if (!entry.injected && entry.afterMessageIndex <= this.messages.length) {
        this.messages.push(entry.message);
        entry.injected = true;
        injectedCount++;
      }
    }

    this.queuedUserMessages = this.queuedUserMessages.filter(
      (entry) => !entry.injected
    );

    return injectedCount;
  }

  private async runTurn(
    agent: Agent,
    round: number,
    history: { role: "user" | "assistant"; content: string }[]
  ) {
    const turnInRound = this.getNextTurnInRound(round);
    this.emit("turn_start", {
      agentId: agent.id,
      agentName: agent.name,
      agentColor: agent.color,
      agentEmoji: agent.emoji,
      round,
      turnInRound,
    });

    this.abortController = new AbortController();
    let fullText = "";

    try {
      await new Promise<void>((resolve, reject) => {
        streamAgentResponse(
          agent.systemPrompt,
          history,
          {
            onToken: (token) => {
              fullText += token;
              this.emit("token", { agentId: agent.id, token });
            },
            onComplete: (text) => {
              fullText = text;
              resolve();
            },
            onError: (error) => {
              reject(error);
            },
          },
          this.abortController!.signal
        ).catch(reject);
      });
    } catch (error) {
      if (!this.stopped) {
        this.emit("error", {
          message: error instanceof Error ? error.message : "Unknown model error",
          agentId: agent.id,
        });
      }
    }

    this.abortController = null;

    if (!fullText.trim()) {
      return { pausedDebate: false };
    }

    const pausedDebate = /\[(?:PAUSE_DEBATE|END_DEBATE)\]/i.test(fullText);
    const cleanedText = fullText
      .replace(/\[(?:PAUSE_DEBATE|END_DEBATE)\]\s*/gi, "")
      .trim();

    if (!cleanedText) {
      return { pausedDebate };
    }

    const message: DiscussionMessage = {
      id: `msg_${Date.now()}_${agent.id}`,
      agentId: agent.id,
      agentName: agent.name,
      agentColor: agent.color,
      agentEmoji: agent.emoji,
      text: cleanedText,
      round,
      turnInRound,
      timestamp: Date.now(),
    };

    this.messages.push(message);
    this.emit("turn_end", {
      messageId: message.id,
      agentId: agent.id,
      agentName: agent.name,
      agentColor: agent.color,
      agentEmoji: agent.emoji,
      round,
      fullText: cleanedText,
    });

    return { pausedDebate };
  }

  private async runModeratorTurn(
    round: number,
    kind: "opening" | "audience_intervention" | "round_transition" | "closing"
  ) {
    const history = buildHistoryForModerator(
      this.messages,
      this.config.topicPrompt,
      round,
      this.config.totalRounds,
      this.config.discussionMode,
      this.agents,
      kind
    );

    const result = await this.runTurn(this.moderator, round, history);

    if (result.pausedDebate) {
      this.stopped = true;
    }
  }

  private async run(): Promise<void> {
    this.stopped = false;
    this.status = "running";

    this.emit("discussion_start", {
      sessionId: this.sessionId,
      agents: this.agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        color: agent.color,
        emoji: agent.emoji,
      })),
      moderator: {
        id: this.moderator.id,
        name: this.moderator.name,
        color: this.moderator.color,
        emoji: this.moderator.emoji,
      },
      topic: this.config.topicPrompt,
      totalRounds: this.config.totalRounds,
    });

    const turnDelay = parseInt(process.env.TURN_DELAY_MS || "800", 10);

    for (let round = 1; round <= this.config.totalRounds; round++) {
      if (this.stopped) {
        break;
      }

      this.currentRound = round;
      this.emit("round_start", {
        round,
        totalRounds: this.config.totalRounds,
      });

      if (round === 1) {
        await this.runModeratorTurn(round, "opening");
      }

      if (this.stopped) {
        break;
      }

      const orderedAgents = this.getAgentOrder(round);

      for (const agent of orderedAgents) {
        if (this.stopped) {
          break;
        }

        const injectedCount = this.flushQueuedUserMessages();

        if (injectedCount > 0) {
          await this.runModeratorTurn(round, "audience_intervention");
        }

        if (this.stopped) {
          break;
        }

        const history = buildHistoryForAgent(
          agent.id,
          this.messages,
          this.config.topicPrompt,
          round,
          this.config.totalRounds,
          this.config.discussionMode,
          this.config.referenceDiscussion ?? null
        );

        await this.runTurn(agent, round, history);

        if (!this.stopped) {
          await new Promise((resolve) => setTimeout(resolve, turnDelay));
        }
      }

      if (this.stopped) {
        break;
      }

      await this.runModeratorTurn(
        round,
        round >= this.config.totalRounds ? "closing" : "round_transition"
      );

      this.emit("round_end", {
        round,
        messagesThisRound: this.messages.filter(
          (message) => message.round === round && message.agentId !== "__user__"
        ).length,
      });
    }

    this.flushQueuedUserMessages();
    this.status = "completed";

    this.emit("discussion_end", {
      totalRounds: this.currentRound || this.config.totalRounds,
      totalMessages: this.messages.length,
    });
  }

  private getAgentOrder(round: number): Agent[] {
    if (this.config.turnOrder === "random") {
      const shuffled = [...this.agents];

      for (let index = shuffled.length - 1; index > 0; index--) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[swapIndex]] = [
          shuffled[swapIndex],
          shuffled[index],
        ];
      }

      return shuffled;
    }

    const offset = (round - 1) % this.agents.length;
    return [...this.agents.slice(offset), ...this.agents.slice(0, offset)];
  }
}

const sessions = new Map<string, DiscussionEngine>();

export function createSession(
  config: DiscussionConfig,
  ownerUserId: string
): DiscussionEngine {
  const engine = new DiscussionEngine(config, ownerUserId);
  sessions.set(engine.getSessionId(), engine);
  return engine;
}

export function getSession(sessionId: string): DiscussionEngine | undefined {
  return sessions.get(sessionId);
}

export function deleteSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.stop();
    sessions.delete(sessionId);
  }
}
