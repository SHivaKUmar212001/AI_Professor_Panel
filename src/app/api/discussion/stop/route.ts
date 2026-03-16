import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getSession } from "@/lib/discussion-engine";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const engine = getSession(sessionId);
    if (!engine) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (!engine.isOwnedBy(session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    engine.stop();
    return NextResponse.json({ status: "stopped" });
  } catch (error) {
    console.error("Error stopping discussion:", error);
    return NextResponse.json({ error: "Failed to stop" }, { status: 500 });
  }
}
