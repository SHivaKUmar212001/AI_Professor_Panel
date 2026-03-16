import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { generateSummary } from "@/lib/anthropic";
import { DiscussionMessage } from "@/lib/types";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messages } = (await req.json()) as { messages: DiscussionMessage[] };

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "No messages to summarize" },
        { status: 400 }
      );
    }

    // Build transcript
    const transcript = messages
      .map((m) => `[${m.agentName}] (Round ${m.round}): ${m.text}`)
      .join("\n\n");

    const summaryJson = await generateSummary(transcript);

    try {
      const summary = JSON.parse(summaryJson);
      return NextResponse.json({ summary });
    } catch {
      return NextResponse.json(
        { summary: null, raw: summaryJson },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Error generating summary:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}
