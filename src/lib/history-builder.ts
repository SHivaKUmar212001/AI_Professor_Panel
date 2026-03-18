import {
  Agent,
  DiscussionMessage,
  DiscussionMode,
  ReferenceDiscussion,
} from "./types";

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

export function buildHistoryForAgent(
  targetAgentId: string,
  allMessages: DiscussionMessage[],
  topicPrompt: string,
  currentRound: number,
  totalRounds: number,
  discussionMode: DiscussionMode,
  referenceDiscussion: ReferenceDiscussion | null
): AnthropicMessage[] {
  const history: AnthropicMessage[] = [];
  const modeInstruction =
    discussionMode === "student"
      ? "Assume curious students and non-specialists are listening, so make your reasoning easy to follow without sounding simplistic. When you introduce a difficult concept, ground it in a concrete example, analogy, comparison, or everyday scenario. If you use technical jargon, translate it in plain language within the same response."
      : "Assume a graduate seminar audience is listening. You can be more technical, reference formal frameworks directly, and use domain vocabulary freely, but stay coherent and concise. Use examples when they sharpen the argument rather than simplifying every point.";
  const referenceInstruction = referenceDiscussion
    ? `\n\nREFERENCE DISCUSSION CONTEXT (${referenceDiscussion.fileName}):\n${referenceDiscussion.content}\n\nTreat that uploaded discussion as background context from an earlier panel. Build on it, challenge it, or connect to it when relevant, but prioritize answering the current topic rather than merely summarizing the old exchange.`
    : "";

  // First message is always the topic prompt
  history.push({
    role: "user",
    content: `DISCUSSION TOPIC: ${topicPrompt}\n\nYou are in a live Cortex Council panel moderated in real time. Speak like an experienced faculty member addressing both peers and students: react directly to what others say, keep the room moving, and avoid detached essay-writing. Be specific and concise. Keep your response to 3-6 sentences. ${modeInstruction}${referenceInstruction}`,
  });

  // Build history from this agent's perspective
  for (const msg of allMessages) {
    if (msg.agentId === targetAgentId) {
      history.push({ role: "assistant", content: msg.text });
    } else if (msg.agentId === "__user__") {
      history.push({
        role: "user",
        content: `[Audience Member]: ${msg.text}`,
      });
    } else {
      history.push({
        role: "user",
        content: `[${msg.agentName}]: ${msg.text}`,
      });
    }
  }

  // Merge consecutive user messages (Anthropic API requirement)
  const merged = mergeConsecutiveUserMessages(history);

  // Late-round variety injection
  if (currentRound >= totalRounds) {
    appendToLastUserMessage(
      merged,
      discussionMode === "student"
        ? "\n\n(Final round: summarize your key position, acknowledge the strongest counterargument you heard, and pose one open question. Phrase at least one part of your conclusion through a concrete example or analogy that a non-expert could follow. Keep to 3-6 sentences.)"
        : "\n\n(Final round: summarize your key position, acknowledge the strongest counterargument you heard, and pose one open question. You may be more technical here, but keep the synthesis crisp and grounded. Keep to 3-6 sentences.)"
    );
  } else if (currentRound >= 3) {
    appendToLastUserMessage(
      merged,
      discussionMode === "student"
        ? "\n\n(Bring a fresh angle: a specific example, an analogy, a counterintuitive claim, or a connection to an unexpected field. Keep to 3-6 sentences.)"
        : "\n\n(Bring a fresh angle: a formal distinction, a counterintuitive claim, a concrete case, or a connection to an unexpected field. Keep to 3-6 sentences.)"
    );
  }

  return merged;
}

export function buildHistoryForModerator(
  allMessages: DiscussionMessage[],
  topicPrompt: string,
  currentRound: number,
  totalRounds: number,
  discussionMode: DiscussionMode,
  panelAgents: Agent[],
  turnKind: "opening" | "audience_intervention" | "round_transition" | "closing"
): AnthropicMessage[] {
  const history: AnthropicMessage[] = [];
  const panelRoster = panelAgents
    .map((agent) => `${agent.name} (${agent.title})`)
    .join(", ");
  const audienceInstruction =
    discussionMode === "student"
      ? "The audience includes students and non-specialists, so translate the live disagreement into language they can follow without flattening the ideas."
      : "The audience can handle a serious, seminar-level exchange, so keep the moderation crisp and intellectually demanding.";
  const turnInstruction =
    turnKind === "opening"
      ? "Open the debate, frame the core question, and invite a rigorous but civil exchange."
      : turnKind === "audience_intervention"
        ? "An audience member has entered the discussion. Briefly acknowledge the intervention and redirect the panel toward the most useful next response."
        : turnKind === "round_transition"
          ? "Summarize the sharpest unresolved disagreement from the round that just ended and steer the next stretch of the debate."
          : "Close the debate with a concise synthesis, naming what became clearer and what remains unresolved.";

  history.push({
    role: "user",
    content: `DEBATE TOPIC: ${topicPrompt}\n\nYou are chairing a live Cortex Council debate. Panelists: ${panelRoster}. Current round: ${currentRound} of ${totalRounds}. ${audienceInstruction} ${turnInstruction} Keep your moderation to 2-4 sentences. If the exchange has become truly hostile, circular, or badly off-topic, begin with [PAUSE_DEBATE] and then briefly explain why you are pausing the debate.`,
  });

  for (const msg of allMessages) {
    if (msg.agentId === "moderator") {
      history.push({ role: "assistant", content: msg.text });
    } else if (msg.agentId === "__user__") {
      history.push({
        role: "user",
        content: `[Audience Member]: ${msg.text}`,
      });
    } else {
      history.push({
        role: "user",
        content: `[${msg.agentName}]: ${msg.text}`,
      });
    }
  }

  return mergeConsecutiveUserMessages(history);
}

function mergeConsecutiveUserMessages(
  messages: AnthropicMessage[]
): AnthropicMessage[] {
  const merged: AnthropicMessage[] = [];

  for (const msg of messages) {
    const last = merged[merged.length - 1];
    if (last && last.role === "user" && msg.role === "user") {
      last.content += "\n\n" + msg.content;
    } else {
      merged.push({ ...msg });
    }
  }

  return merged;
}

function appendToLastUserMessage(
  messages: AnthropicMessage[],
  text: string
): void {
  // Find last user message or add injection to the end
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      messages[i].content += text;
      return;
    }
  }
  // If no user message found (shouldn't happen), add one
  messages.push({ role: "user", content: text });
}
