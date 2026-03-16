import { DiscussionMessage, DiscussionConfig, Agent } from "./types";
import { getAgent } from "./agents";
import { buildHistoryForAgent } from "./history-builder";
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
      .filter((a): a is Agent => a !== undefined);

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
    for (const entry of this.queuedUserMessages) {
      if (!entry.injected && entry.afterMessageIndex <= this.messages.length) {
        this.messages.push(entry.message);
        entry.injected = true;
      }
    }

    this.queuedUserMessages = this.queuedUserMessages.filter(
      (entry) => !entry.injected
    );
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

      const orderedAgents = this.getAgentOrder(round);
      let turnInRound = 0;

      for (const agent of orderedAgents) {
        if (this.stopped) {
          break;
        }

        this.flushQueuedUserMessages();

        turnInRound++;
        this.emit("turn_start", {
          agentId: agent.id,
          agentName: agent.name,
          agentColor: agent.color,
          agentEmoji: agent.emoji,
          round,
          turnInRound,
        });

        const history = buildHistoryForAgent(
          agent.id,
          this.messages,
          this.config.topicPrompt,
          round,
          this.config.totalRounds,
          this.config.discussionMode,
          this.config.referenceDiscussion ?? null
        );

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
              message:
                error instanceof Error ? error.message : "Unknown model error",
              agentId: agent.id,
            });
          }
        }

        if (fullText) {
          const message: DiscussionMessage = {
            id: `msg_${Date.now()}_${agent.id}`,
            agentId: agent.id,
            agentName: agent.name,
            agentColor: agent.color,
            agentEmoji: agent.emoji,
            text: fullText,
            round,
            turnInRound,
            timestamp: Date.now(),
          };

          this.messages.push(message);
          this.emit("turn_end", {
            messageId: message.id,
            agentId: agent.id,
            round,
            fullText,
          });
        }

        this.abortController = null;

        if (!this.stopped) {
          await new Promise((resolve) => setTimeout(resolve, turnDelay));
        }
      }

      this.emit("round_end", {
        round,
        messagesThisRound: turnInRound,
      });
    }

    this.flushQueuedUserMessages();
    this.status = "completed";

    this.emit("discussion_end", {
      totalRounds: this.config.totalRounds,
      totalMessages: this.messages.length,
    });
  }

  private getAgentOrder(round: number): Agent[] {
    if (this.config.turnOrder === "random") {
      const shuffled = [...this.agents];

      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
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
