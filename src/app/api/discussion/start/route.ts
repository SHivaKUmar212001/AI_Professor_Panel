import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createSession } from "@/lib/discussion-engine";
import { getAgent } from "@/lib/agents";
import { DiscussionConfig } from "@/lib/types";
import { authOptions } from "@/lib/auth";
import { prepareReferenceDiscussion } from "@/lib/discussion-context";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      agentIds,
      topicPrompt,
      totalRounds = 5,
      turnOrder = "rotate",
      discussionMode = "student",
      referenceDiscussion = null,
    } = body as DiscussionConfig;

    if (!agentIds || agentIds.length < 2 || agentIds.length > 5) {
      return NextResponse.json(
        { error: "Select 2-5 agents" },
        { status: 400 }
      );
    }

    if (!topicPrompt || topicPrompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Topic is required" },
        { status: 400 }
      );
    }

    const agents = agentIds.map((id: string) => getAgent(id)).filter(Boolean);
    if (agents.length < 2) {
      return NextResponse.json(
        { error: "At least 2 valid agents required" },
        { status: 400 }
      );
    }

    const config: DiscussionConfig = {
      agentIds,
      topicPrompt: topicPrompt.trim(),
      totalRounds: Math.min(Math.max(totalRounds, 3), 8),
      turnOrder,
      discussionMode:
        discussionMode === "academic" ? "academic" : "student",
      referenceDiscussion: prepareReferenceDiscussion(referenceDiscussion),
    };

    const engine = createSession(config, session.user.id);
    engine.start().catch((error) => {
      console.error("Discussion engine failed:", error);
    });

    return NextResponse.json({
      sessionId: engine.getSessionId(),
      agents: agents.map((a) => ({
        id: a!.id,
        name: a!.name,
        color: a!.color,
        emoji: a!.emoji,
      })),
      status: "ready",
    });
  } catch (error) {
    console.error("Error starting discussion:", error);
    return NextResponse.json(
      { error: "Failed to start discussion" },
      { status: 500 }
    );
  }
}
