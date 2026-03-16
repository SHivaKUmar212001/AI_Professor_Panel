import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import {
  normalizeUsername,
  validateDisplayName,
  validatePassword,
  validateUsername,
} from "@/lib/account-utils";
import { createUserRecord, findUserByUsername } from "@/lib/user-database";

export async function POST(req: NextRequest) {
  try {
    const {
      username: rawUsername,
      password,
      displayName: rawDisplayName,
    } = (await req.json()) as {
      username?: string;
      password?: string;
      displayName?: string;
    };

    const username = normalizeUsername(rawUsername ?? "");
    const displayName = (rawDisplayName ?? "").trim();

    const usernameError = validateUsername(username);
    if (usernameError) {
      return NextResponse.json({ error: usernameError }, { status: 400 });
    }

    const passwordError = validatePassword(password ?? "");
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const displayNameError = validateDisplayName(displayName);
    if (displayNameError) {
      return NextResponse.json({ error: displayNameError }, { status: 400 });
    }

    const existingUser = findUserByUsername(username);

    if (existingUser) {
      return NextResponse.json(
        { error: "That username is already taken." },
        { status: 409 }
      );
    }

    const passwordHash = await hash(password!, 12);

    const user = createUserRecord({
      username,
      displayName: displayName || username,
      passwordHash,
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Error creating account:", error);

    return NextResponse.json(
      { error: "Unable to create account right now." },
      { status: 500 }
    );
  }
}
