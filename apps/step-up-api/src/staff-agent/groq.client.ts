import { randomUUID } from "node:crypto";
import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type {
  AgentChatMessage,
  AgentToolCall,
  AgentToolDefinition,
} from "./agent.types";
import { aiUnavailable } from "./ai-errors";

const GROQ_BASE = "https://api.groq.com/openai/v1";

/** Production Groq chat model (replaces retired llama-3.3-70b-versatile). */
export const GROQ_CHAT_MODEL_DEFAULT = "openai/gpt-oss-120b";
export const GROQ_STT_MODEL_DEFAULT = "whisper-large-v3-turbo";
export const GROQ_TTS_MODEL_DEFAULT = "canopylabs/orpheus-v1-english";
export const GROQ_TTS_VOICE_DEFAULT = "hannah";

type GroqToolCall = {
  id?: string;
  type?: string;
  function?: { name?: string; arguments?: string };
};

type GroqChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
      tool_calls?: GroqToolCall[];
    };
  }>;
  error?: { message?: string };
};

@Injectable()
export class GroqClient {
  chatModel(override?: string | null): string {
    return override?.trim() || GROQ_CHAT_MODEL_DEFAULT;
  }

  sttModel(): string {
    return GROQ_STT_MODEL_DEFAULT;
  }

  ttsModel(): string {
    return GROQ_TTS_MODEL_DEFAULT;
  }

  ttsVoice(): string {
    return GROQ_TTS_VOICE_DEFAULT;
  }

  async chat(input: {
    apiKey: string;
    chatModel?: string | null;
    messages: AgentChatMessage[];
    tools?: AgentToolDefinition[];
    temperature?: number;
    maxTokens?: number;
  }): Promise<{
    content: string | null;
    toolCalls: AgentToolCall[];
    model: string;
  }> {
    const apiKey = input.apiKey.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        "AI agent is not configured for this studio.",
      );
    }
    const model = this.chatModel(input.chatModel);

    const body: Record<string, unknown> = {
      model,
      messages: toGroqMessages(input.messages),
      temperature: input.temperature ?? 0.2,
      max_tokens: input.maxTokens ?? 1024,
    };

    if (input.tools && input.tools.length > 0) {
      body.tools = input.tools;
      body.tool_choice = "auto";
    }

    const response = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as GroqChatResponse;
    if (!response.ok) {
      throw aiUnavailable(
        response.status,
        data.error?.message ?? "Groq chat request failed",
      );
    }

    const message = data.choices?.[0]?.message;
    const text = message?.content?.trim() || null;
    const toolCalls: AgentToolCall[] = (message?.tool_calls ?? [])
      .filter((call) => call.function?.name)
      .map((call) => ({
        id: call.id ?? randomUUID(),
        type: "function" as const,
        function: {
          name: call.function?.name ?? "unknown",
          arguments: call.function?.arguments ?? "{}",
        },
      }));

    return { content: text, toolCalls, model };
  }

  async transcribe(
    apiKey: string,
    audio: Buffer,
    mimeType: string,
  ): Promise<string> {
    const key = apiKey.trim();
    if (!key) {
      throw new ServiceUnavailableException(
        "AI agent is not configured for this studio.",
      );
    }
    const model = this.sttModel();
    const form = new FormData();
    const filename = `recording${extensionForMime(mimeType)}`;
    form.append(
      "file",
      new Blob([new Uint8Array(audio)], { type: mimeType }),
      filename,
    );
    form.append("model", model);
    form.append("response_format", "json");
    form.append("temperature", "0");

    const response = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
      },
      body: form,
    });

    const data = (await response.json()) as {
      text?: string;
      error?: { message?: string };
    };
    if (!response.ok) {
      throw aiUnavailable(
        response.status,
        data.error?.message ?? "Groq transcription failed",
      );
    }

    return (data.text ?? "").trim();
  }

  async synthesizeSpeech(apiKey: string, text: string): Promise<Buffer | null> {
    const key = apiKey.trim();
    const trimmed = text.trim().slice(0, 2000);
    if (!key || !trimmed) {
      return null;
    }

    try {
      const response = await fetch(`${GROQ_BASE}/audio/speech`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.ttsModel(),
          voice: this.ttsVoice(),
          input: trimmed,
          response_format: "wav",
        }),
      });

      if (!response.ok) {
        return null;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      return buffer.length > 0 ? buffer : null;
    } catch {
      return null;
    }
  }
}

/** Maps agent history into OpenAI-compatible Groq messages. */
export function toGroqMessages(
  messages: AgentChatMessage[],
): Array<Record<string, unknown>> {
  return messages.map((message) => {
    if (message.role === "tool") {
      return {
        role: "tool",
        tool_call_id: message.tool_call_id,
        content: message.content ?? "",
      };
    }

    if (message.role === "assistant" && message.tool_calls?.length) {
      return {
        role: "assistant",
        content: message.content,
        tool_calls: message.tool_calls.map((call) => ({
          id: call.id,
          type: "function",
          function: {
            name: call.function.name,
            arguments: call.function.arguments,
          },
        })),
      };
    }

    return {
      role: message.role,
      content: message.content ?? "",
    };
  });
}

function extensionForMime(mimeType: string): string {
  const mime = mimeType.toLowerCase().split(";")[0]?.trim() ?? "";
  switch (mime) {
    case "audio/webm":
      return ".webm";
    case "audio/mp4":
    case "audio/x-m4a":
    case "audio/m4a":
      return ".m4a";
    case "audio/mpeg":
      return ".mp3";
    case "audio/ogg":
      return ".ogg";
    case "audio/wav":
      return ".wav";
    case "audio/aac":
      return ".aac";
    default:
      return ".webm";
  }
}
