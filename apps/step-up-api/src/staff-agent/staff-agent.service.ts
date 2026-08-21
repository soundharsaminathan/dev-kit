import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { requireUserStudioId } from "../auth/studio-access";
import type { DecryptedUser } from "../users/user-crypto.service";
import {
  GROQ_CHAT_MODEL,
  type GroqChatMessage,
  GroqClient,
} from "./groq.client";
import {
  createResolvedIds,
  parseToolArguments,
  type StaffAgentAction,
  StaffAgentToolExecutor,
} from "./tool-executor";
import { STAFF_AGENT_SYSTEM_PROMPT, STAFF_AGENT_TOOLS } from "./tools";

const MAX_HISTORY = 20;
const MAX_CONTENT = 4000;
const MAX_TOOL_ROUNDS = 4;
const MAX_AUDIO_BYTES = 3 * 1024 * 1024; // ~30s webm budget
const ALLOWED_AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/x-m4a",
  "audio/aac",
]);

export type StaffAgentChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type StaffAgentChatResult = {
  transcript?: string;
  reply: string;
  actions: StaffAgentAction[];
  audioBase64?: string;
  model: string;
};

@Injectable()
export class StaffAgentService {
  constructor(
    @Inject(GroqClient) private readonly groq: GroqClient,
    @Inject(StaffAgentToolExecutor)
    private readonly tools: StaffAgentToolExecutor,
  ) {}

  async chat(
    actor: DecryptedUser,
    input: {
      messages: StaffAgentChatMessage[];
      voice?: boolean;
      audioBase64?: string;
      audioMimeType?: string;
    },
  ): Promise<StaffAgentChatResult> {
    this.groq.requireApiKey();
    const studioId = requireUserStudioId(actor);

    let transcript: string | undefined;
    const history = sanitizeMessages(input.messages);

    if (input.audioBase64) {
      const mime = normalizeMime(input.audioMimeType ?? "audio/webm");
      if (!ALLOWED_AUDIO_TYPES.has(mime)) {
        throw new BadRequestException(
          "Unsupported audio type. Use webm, mp4, mpeg, ogg, wav, m4a, or aac.",
        );
      }
      const buffer = Buffer.from(input.audioBase64, "base64");
      if (buffer.length === 0) {
        throw new BadRequestException("Audio recording was empty");
      }
      if (buffer.length > MAX_AUDIO_BYTES) {
        throw new BadRequestException(
          "Audio is too large. Keep recordings under about 30 seconds.",
        );
      }
      transcript = await this.groq.transcribe(buffer, mime);
      if (!transcript) {
        throw new BadRequestException("Could not transcribe the recording");
      }
      history.push({ role: "user", content: transcript });
    }

    if (history.length === 0 || history.every((m) => m.role !== "user")) {
      throw new BadRequestException(
        "messages must include at least one user turn (or provide audio)",
      );
    }

    const messages: GroqChatMessage[] = [
      { role: "system", content: STAFF_AGENT_SYSTEM_PROMPT },
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const resolved = createResolvedIds();
    const actions: StaffAgentAction[] = [];
    let model = GROQ_CHAT_MODEL;
    let finalReply = "";

    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const completion = await this.groq.chat({
        messages,
        tools: STAFF_AGENT_TOOLS,
      });
      model = completion.model;

      if (completion.toolCalls.length === 0) {
        finalReply =
          completion.content ??
          "I could not produce a reply. Try rephrasing your request.";
        break;
      }

      messages.push({
        role: "assistant",
        content: completion.content,
        tool_calls: completion.toolCalls,
      });

      for (const call of completion.toolCalls) {
        let args: unknown;
        try {
          args = parseToolArguments(call.function.arguments);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Invalid tool arguments";
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify({ error: message }),
          });
          actions.push({
            tool: call.function.name,
            ok: false,
            summary: message,
          });
          continue;
        }

        const result = await this.tools.execute(
          call.function.name,
          args,
          actor,
          studioId,
          resolved,
        );
        if (result.action) {
          actions.push(result.action);
        }
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: result.content.slice(0, 8000),
        });
      }

      if (round === MAX_TOOL_ROUNDS - 1) {
        const wrap = await this.groq.chat({
          messages: [
            ...messages,
            {
              role: "user",
              content:
                "Summarize the tool results for the staff user now. Do not call more tools.",
            },
          ],
        });
        finalReply =
          wrap.content ??
          "I finished the requested actions. Check Trial caller for updates.";
        model = wrap.model;
      }
    }

    if (!finalReply) {
      finalReply = "Done.";
    }

    let audioBase64: string | undefined;
    if (input.voice || input.audioBase64) {
      const speech = await this.groq.synthesizeSpeech(finalReply);
      if (speech && speech.length > 0) {
        audioBase64 = speech.toString("base64");
      }
    }

    return {
      transcript,
      reply: finalReply,
      actions,
      audioBase64,
      model,
    };
  }
}

function sanitizeMessages(
  messages: StaffAgentChatMessage[],
): StaffAgentChatMessage[] {
  const cleaned = (Array.isArray(messages) ? messages : [])
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0,
    )
    .map((m) => ({
      role: m.role,
      content: m.content.trim().slice(0, MAX_CONTENT),
    }));
  return cleaned.slice(-MAX_HISTORY);
}

function normalizeMime(value: string): string {
  return value.trim().toLowerCase().split(";")[0]?.trim() ?? "";
}
