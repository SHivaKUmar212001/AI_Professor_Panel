import { DiscussionMessage, DiscussionMode, ReferenceDiscussion } from "./types";

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
    content: `DISCUSSION TOPIC: ${topicPrompt}\n\nYou are in a panel discussion with other experts. Engage directly with what others say. Be specific and concise. Keep your response to 3-6 sentences. ${modeInstruction}${referenceInstruction}`,
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
