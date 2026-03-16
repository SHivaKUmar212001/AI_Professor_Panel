import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

export async function streamAgentResponse(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  let fullText = "";

  try {
    const stream = await client.messages.stream(
      {
        model: process.env.MODEL || "claude-sonnet-4-20250514",
        max_tokens: parseInt(process.env.MAX_TOKENS_PER_TURN || "500"),
        system: systemPrompt,
        messages,
      },
      { signal }
    );

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        const token = event.delta.text;
        fullText += token;
        callbacks.onToken(token);
      }
    }

    callbacks.onComplete(fullText);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      callbacks.onComplete(fullText);
      return;
    }
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}

export async function generateSummary(
  transcript: string
): Promise<string> {
  const response = await client.messages.create({
    model: process.env.MODEL || "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: `You are an expert discussion analyst. Given a multi-agent intellectual discussion transcript, produce a structured analysis. Be specific and reference what each participant actually said. Respond in valid JSON format.`,
    messages: [
      {
        role: "user",
        content: `${transcript}

Produce this analysis as a JSON object with these keys:
- "coreTheses": array of {"agentName": string, "thesis": string} — 1-2 sentences per agent summarizing their main position
- "keyInsights": array of strings — 3-5 most valuable ideas that emerged, noting which agent raised them
- "strongestDisagreements": array of strings — where did agents most sharply diverge?
- "unexpectedConnections": array of strings — any moments where an agent drew a surprising cross-domain parallel?
- "unresolvedQuestions": array of strings — what questions remain open?
- "verdict": string — synthesize all perspectives into one nuanced position, 2-3 sentences

Return ONLY the JSON object, no markdown formatting.`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.text || "{}";
}
