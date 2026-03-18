import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

type VoiceRecord = {
  name: string;
  locale: string;
};

const preferredVoiceOrder = [
  "Samantha",
  "Daniel",
  "Karen",
  "Moira",
  "Tessa",
  "Ava",
  "Serena",
  "Rishi",
  "Aman",
  "Oliver",
  "Alex",
  "Veena",
];

let availableVoicesPromise: Promise<VoiceRecord[]> | null = null;
const openAIVoices = [
  "coral",
  "sage",
  "ash",
  "verse",
  "alloy",
  "ballad",
  "echo",
  "fable",
  "nova",
  "onyx",
  "shimmer",
] as const;

function getVoiceSeed(label?: string) {
  const safeLabel =
    typeof label === "string" && label.trim().length > 0
      ? label
      : "Cortex Council";

  return Array.from(safeLabel).reduce(
    (total, char, index) => total + char.charCodeAt(0) * (index + 7),
    0
  );
}

async function getAvailableVoices() {
  if (!availableVoicesPromise) {
    availableVoicesPromise = execFileAsync("say", ["-v", "?"]).then(
      ({ stdout }) =>
        stdout
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const match = line.match(/^(.*?)\s+([a-z]{2}_[A-Z]{2})\s+#/);
            if (!match) {
              return null;
            }

            return {
              name: match[1].trim(),
              locale: match[2],
            };
          })
          .filter((voice): voice is VoiceRecord => voice !== null)
    );
  }

  return availableVoicesPromise;
}

async function chooseVoice(agentId?: string, agentName?: string, seed?: number) {
  const voices = await getAvailableVoices();
  const englishVoices = voices.filter((voice) => voice.locale.startsWith("en_"));

  if (englishVoices.length === 0) {
    return null;
  }

  const preferredPool = preferredVoiceOrder.filter((voiceName) =>
    englishVoices.some((voice) => voice.name === voiceName)
  );

  if (agentId === "moderator") {
    return preferredPool.includes("Samantha")
      ? "Samantha"
      : preferredPool[0] ?? englishVoices[0]?.name ?? null;
  }

  const selectionPool = preferredPool.length > 0
    ? preferredPool
    : englishVoices.map((voice) => voice.name);

  const effectiveSeed = typeof seed === "number" ? seed : getVoiceSeed(agentName || agentId);
  return selectionPool[effectiveSeed % selectionPool.length] ?? englishVoices[0]?.name ?? null;
}

function getSpeechRate(agentId?: string, seed?: number) {
  if (agentId === "moderator") {
    return "180";
  }

  const effectiveSeed = typeof seed === "number" ? seed : getVoiceSeed(agentId);
  return String(172 + (effectiveSeed % 28));
}

function chooseOpenAIVoice(agentId?: string, seed?: number) {
  if (agentId === "moderator") {
    return "coral";
  }

  const effectiveSeed = typeof seed === "number" ? seed : getVoiceSeed(agentId);
  return openAIVoices[effectiveSeed % openAIVoices.length];
}

function getOpenAIInstructions(agentId?: string, agentName?: string) {
  const speakerLabel = agentName || "the panel speaker";

  if (agentId === "moderator") {
    return `Speak as ${speakerLabel}, a calm, articulate debate moderator. Sound warm, intelligent, and composed, with natural pauses and clear emphasis. Deliver the line like a real live panel host in polished English, never robotic or theatrical.`;
  }

  return `Speak as ${speakerLabel}, an expert academic debater on a live panel. Sound articulate, human, and conversational, with confident phrasing, natural emphasis, and clean English diction. Avoid sounding robotic, synthetic, or overdramatic.`;
}

async function generateOpenAITts(params: {
  text: string;
  agentId?: string;
  agentName?: string;
  voiceSeed?: number;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
      input: params.text,
      voice: chooseOpenAIVoice(params.agentId, params.voiceSeed),
      instructions: getOpenAIInstructions(params.agentId, params.agentName),
      response_format: "wav",
      speed: params.agentId === "moderator" ? 0.96 : 1,
    }),
  });

  if (!response.ok) {
    const fallbackMessage = `OpenAI TTS request failed with status ${response.status}.`;
    let message = fallbackMessage;

    try {
      const data = (await response.json()) as {
        error?: { message?: string } | string;
      };
      if (typeof data?.error === "string" && data.error.trim().length > 0) {
        message = data.error;
      } else if (
        typeof data?.error === "object" &&
        data.error &&
        typeof data.error.message === "string" &&
        data.error.message.trim().length > 0
      ) {
        message = data.error.message;
      }
    } catch {
      // Keep the fallback message if the error body isn't JSON.
    }

    throw new Error(message);
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  return {
    audioBuffer,
    contentType: response.headers.get("content-type") || "audio/wav",
  };
}

export async function POST(request: NextRequest) {
  if (process.platform !== "darwin") {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "No TTS provider is configured. Add OPENAI_API_KEY to use natural voices." },
        { status: 501 }
      );
    }
  }

  try {
    const rawBody = await request.text();

    if (request.signal.aborted || rawBody.trim().length === 0) {
      return NextResponse.json(
        { error: "Voice request was cancelled before the payload arrived." },
        { status: 400 }
      );
    }

    let body: {
      text?: unknown;
      agentId?: unknown;
      agentName?: unknown;
      voiceSeed?: unknown;
    };

    try {
      body = JSON.parse(rawBody) as typeof body;
    } catch {
      return NextResponse.json(
        { error: "Voice request body is not valid JSON." },
        { status: 400 }
      );
    }

    const rawText =
      typeof body?.text === "string" ? body.text.replace(/\s+/g, " ").trim() : "";
    const clippedText =
      rawText.length > 900 ? `${rawText.slice(0, 897).trimEnd()}...` : rawText;

    if (!clippedText) {
      return NextResponse.json({ error: "Text is required." }, { status: 400 });
    }

    const openAiAudio = await generateOpenAITts({
      text: clippedText,
      agentId: typeof body?.agentId === "string" ? body.agentId : undefined,
      agentName: typeof body?.agentName === "string" ? body.agentName : undefined,
      voiceSeed: typeof body?.voiceSeed === "number" ? body.voiceSeed : undefined,
    });

    if (openAiAudio) {
      return new NextResponse(new Uint8Array(openAiAudio.audioBuffer), {
        headers: {
          "Content-Type": openAiAudio.contentType,
          "Cache-Control": "no-store, max-age=0",
          "Content-Length": String(openAiAudio.audioBuffer.byteLength),
          "X-TTS-Provider": "openai",
        },
      });
    }

    const voice = await chooseVoice(
      typeof body?.agentId === "string" ? body.agentId : undefined,
      typeof body?.agentName === "string" ? body.agentName : undefined,
      typeof body?.voiceSeed === "number" ? body.voiceSeed : undefined
    );

    if (!voice) {
      return NextResponse.json(
        { error: "No English macOS voice is available." },
        { status: 500 }
      );
    }

    const tempDir = await mkdtemp(path.join(tmpdir(), "cortex-council-tts-"));
    const sourcePath = path.join(tempDir, "speech.aiff");
    const outputPath = path.join(tempDir, "speech.wav");

    try {
      await execFileAsync("say", [
        "-v",
        voice,
        "-r",
        getSpeechRate(
          typeof body?.agentId === "string" ? body.agentId : undefined,
          typeof body?.voiceSeed === "number" ? body.voiceSeed : undefined
        ),
        "-o",
        sourcePath,
        clippedText,
      ]);

      await execFileAsync("afconvert", [
        "-f",
        "WAVE",
        "-d",
        "LEI16",
        sourcePath,
        outputPath,
      ]);

      const audioBuffer = await readFile(outputPath);

      return new NextResponse(new Uint8Array(audioBuffer), {
        headers: {
          "Content-Type": "audio/wav",
          "Cache-Control": "no-store, max-age=0",
          "Content-Length": String(audioBuffer.byteLength),
          "X-TTS-Provider": "macos-say",
        },
      });
    } finally {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  } catch (error) {
    if (request.signal.aborted) {
      return NextResponse.json(
        { error: "Voice request was cancelled." },
        { status: 400 }
      );
    }

    console.error("Error generating debate voice:", error);
    return NextResponse.json(
      { error: "Failed to generate debate voice." },
      { status: 500 }
    );
  }
}
