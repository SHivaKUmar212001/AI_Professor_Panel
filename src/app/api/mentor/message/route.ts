import { NextRequest } from "next/server";
import { getAgent } from "@/lib/agents";
import { streamAgentResponse } from "@/lib/anthropic";

const MENTOR_SYSTEM_INJECTION = `
You are in MENTOR MODE. You are having a one-on-one conversation with a student/learner. Your job is to:
- Guide their thinking, don't just lecture
- Ask them questions back — make them work for the insight
- Challenge their assumptions gently but firmly
- If they say something wrong, correct it with kindness and evidence
- If they say something insightful, acknowledge it enthusiastically
- Adjust your depth based on their apparent expertise level
- Use the Socratic method: lead them to discover answers themselves
- Read the student's likely psychology: confusion, anxiety, overconfidence, hesitation, curiosity, burnout, or hidden misconception
- Protect the student's dignity while still being honest about what they have misunderstood
- Give practical next steps when useful: what to read, what to test, what to practice, or what question to ask next
- Sound like a real mentor who has taught many kinds of students, not a generic assistant
- Keep responses to 3-8 sentences. Be conversational, never bullet-pointed.
`;

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, topicPrompt, conversationHistory, userMessage } = body;

    if (!agentId || !topicPrompt) {
      return new Response(JSON.stringify({ error: "Missing agentId or topicPrompt" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const agent = getAgent(agentId);
    if (!agent) {
      return new Response(JSON.stringify({ error: "Agent not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const systemPrompt = agent.systemPrompt + "\n\n" + MENTOR_SYSTEM_INJECTION;

    // Build messages array
    const messages: { role: "user" | "assistant"; content: string }[] = [];

    // Opening context
    if (!conversationHistory || conversationHistory.length === 0) {
      // First message: mentor opens the conversation
      messages.push({
        role: "user",
        content: `TOPIC: ${topicPrompt}\n\nThe student has chosen you as their mentor and wants to explore this topic. Open the conversation with a thought-provoking question or observation that invites them to think deeply. Don't lecture — engage them, gauge where they are mentally, and make the student feel both challenged and supported.`,
      });
    } else {
      // Continuing conversation
      messages.push({
        role: "user",
        content: `TOPIC: ${topicPrompt}\n\nYou are mentoring a student on this topic. Engage them with the Socratic method, adapt to their likely confidence level, and respond like a real teacher who understands how students think and where they usually get stuck.`,
      });

      for (const msg of conversationHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }

      if (userMessage) {
        messages.push({ role: "user", content: userMessage });
      }
    }

    // Merge consecutive user messages
    const merged: typeof messages = [];
    for (const msg of messages) {
      const last = merged[merged.length - 1];
      if (last && last.role === "user" && msg.role === "user") {
        last.content += "\n\n" + msg.content;
      } else {
        merged.push({ ...msg });
      }
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          try {
            controller.enqueue(encoder.encode(sseEvent(event, data)));
          } catch {
            // stream closed
          }
        };

        send("mentor_start", { agentId: agent.id, agentName: agent.name });

        await streamAgentResponse(
          systemPrompt,
          merged,
          {
            onToken: (token) => {
              send("token", { token });
            },
            onComplete: (fullText) => {
              send("mentor_end", { fullText });
            },
            onError: (error) => {
              send("error", { message: error.message });
            },
          }
        );

        try {
          controller.close();
        } catch {
          // already closed
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Mentor message error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate mentor response" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
