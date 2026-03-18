export interface Agent {
  id: string;
  name: string;
  title: string;
  category: AgentCategory;
  emoji: string;
  color: string;
  reasoningStyle: string;
  signatureMove: string;
  expertise: string[];
  systemPrompt: string;
}

export type AgentCategory =
  | "Sciences"
  | "Mathematics & Computer Science"
  | "Philosophy & Humanities"
  | "Social Sciences & Strategy"
  | "Engineering & Applied Sciences"
  | "Wildcards";

export interface Topic {
  id: string;
  category: string;
  prompt: string;
}

export type AppMode = "mentor" | "debate";
export type DiscussionMode = "student" | "academic";
export type AvatarState = "idle" | "listening" | "thinking" | "speaking";

export interface ReferenceDiscussion {
  fileName: string;
  content: string;
  uploadedAt: number;
}

export interface DiscussionConfig {
  agentIds: string[];
  topicPrompt: string;
  totalRounds: number;
  turnOrder: "rotate" | "random";
  discussionMode: DiscussionMode;
  referenceDiscussion?: ReferenceDiscussion | null;
}

export interface DiscussionMessage {
  id: string;
  agentId: string;
  agentName: string;
  agentColor: string;
  agentEmoji: string;
  text: string;
  round: number;
  turnInRound: number;
  timestamp: number;
}

export interface DiscussionSession {
  sessionId: string;
  config: DiscussionConfig;
  agents: Agent[];
  messages: DiscussionMessage[];
  status: "ready" | "running" | "paused" | "completed" | "error";
  currentRound: number;
  currentAgentIndex: number;
}

// SSE Event Types
export interface SSEEvent {
  event: string;
  data: unknown;
}

export interface DiscussionStartEvent {
  sessionId: string;
  agents: { id: string; name: string; color: string; emoji: string }[];
  topic: string;
  totalRounds: number;
}

export interface RoundStartEvent {
  round: number;
  totalRounds: number;
}

export interface TurnStartEvent {
  agentId: string;
  agentName: string;
  agentColor: string;
  agentEmoji: string;
  round: number;
  turnInRound: number;
}

export interface TokenEvent {
  agentId: string;
  token: string;
}

export interface TurnEndEvent {
  agentId: string;
  round: number;
  fullText: string;
  agentName?: string;
  agentColor?: string;
  agentEmoji?: string;
  messageId?: string;
}

export interface RoundEndEvent {
  round: number;
  messagesThisRound: number;
}

export interface DiscussionEndEvent {
  totalRounds: number;
  totalMessages: number;
}

export interface ErrorEvent {
  message: string;
  agentId?: string;
}

// Summary
export interface DiscussionSummary {
  coreTheses: { agentName: string; thesis: string }[];
  keyInsights: string[];
  strongestDisagreements: string[];
  unexpectedConnections: string[];
  unresolvedQuestions: string[];
  verdict: string;
}

// Zustand Store
export interface DiscussionStore {
  // State
  appMode: AppMode | null;
  selectedAgents: string[];
  topic: string;
  totalRounds: number;
  discussionMode: DiscussionMode;
  referenceDiscussion: ReferenceDiscussion | null;
  messages: DiscussionMessage[];
  status: "idle" | "setup" | "running" | "paused" | "completed" | "error";
  currentRound: number;
  currentAgent: { id: string; name: string; color: string; emoji: string } | null;
  streamingText: string;
  sessionId: string | null;
  lastEventId: number;
  summary: DiscussionSummary | null;
  error: string | null;
  userMessages: { text: string; afterMessageIndex: number }[];
  avatarStates: Record<string, AvatarState>;

  // Actions
  setAppMode: (mode: AppMode) => void;
  toggleAgent: (agentId: string) => void;
  setMentorAgent: (agentId: string) => void;
  setTopic: (topic: string) => void;
  setTotalRounds: (rounds: number) => void;
  setDiscussionMode: (mode: DiscussionMode) => void;
  setReferenceDiscussion: (discussion: ReferenceDiscussion | null) => void;
  setStatus: (status: DiscussionStore["status"]) => void;
  addMessage: (message: DiscussionMessage) => void;
  setCurrentRound: (round: number) => void;
  setCurrentAgent: (agent: DiscussionStore["currentAgent"]) => void;
  appendStreamingText: (token: string) => void;
  clearStreamingText: () => void;
  setSessionId: (id: string) => void;
  setLastEventId: (eventId: number) => void;
  setSummary: (summary: DiscussionSummary | null) => void;
  setError: (error: string | null) => void;
  addUserMessage: (text: string) => void;
  setAvatarState: (agentId: string, state: AvatarState) => void;
  reset: () => void;
}
