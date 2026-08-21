import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const GROQ_BASE = "https://api.groq.com/openai/v1";
export const GROQ_CHAT_MODEL = "llama-3.3-70b-versatile";
export const GROQ_STT_MODEL = "whisper-large-v3";
export const GROQ_TTS_MODEL = "playai-tts";
export const GROQ_TTS_VOICE = "Fritz-PlayAI";

export type GroqChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_call_id?: string;
  tool_calls?: GroqToolCall[];
};

export type GroqToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type GroqToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      role?: string;
      content?: string | null;
      tool_calls?: GroqToolCall[];
    };
    finish_reason?: string;
  }>;
  error?: { message?: string };
};

@Injectable()
export class GroqClient {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  getApiKey(): string | null {
    const key = this.config.get<string>("GROQ_API_KEY")?.trim();
    return key || null;
  }

  requireApiKey(): string {
    const key = this.getApiKey();
    if (!key) {
      throw new ServiceUnavailableException(
        "Staff agent is unavailable: GROQ_API_KEY is not configured",
      );
    }
    return key;
  }

  async chat(input: {
    messages: GroqChatMessage[];
    tools?: GroqToolDefinition[];
    temperature?: number;
    maxTokens?: number;
  }): Promise<{
    content: string | null;
    toolCalls: GroqToolCall[];
    model: string;
  }> {
    const apiKey = this.requireApiKey();
    const body: Record<string, unknown> = {
      model: GROQ_CHAT_MODEL,
      messages: input.messages,
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

    const data = (await response.json()) as ChatCompletionResponse;
    if (!response.ok) {
      throw new ServiceUnavailableException(
        data.error?.message ?? "Groq chat request failed",
      );
    }

    const message = data.choices?.[0]?.message;
    return {
      content: message?.content?.trim() || null,
      toolCalls: message?.tool_calls ?? [],
      model: GROQ_CHAT_MODEL,
    };
  }

  async transcribe(audio: Buffer, mimeType: string): Promise<string> {
    const apiKey = this.requireApiKey();
    const extension = extensionForMime(mimeType);
    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array(audio)], { type: mimeType }),
      `voice.${extension}`,
    );
    form.append("model", GROQ_STT_MODEL);
    form.append("response_format", "json");

    const response = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    const data = (await response.json()) as {
      text?: string;
      error?: { message?: string };
    };
    if (!response.ok) {
      throw new ServiceUnavailableException(
        data.error?.message ?? "Groq transcription failed",
      );
    }
    return (data.text ?? "").trim();
  }

  async synthesizeSpeech(text: string): Promise<Buffer | null> {
    const apiKey = this.getApiKey();
    if (!apiKey || !text.trim()) {
      return null;
    }

    try {
      const response = await fetch(`${GROQ_BASE}/audio/speech`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: GROQ_TTS_MODEL,
          voice: GROQ_TTS_VOICE,
          input: text.slice(0, 2000),
          response_format: "wav",
        }),
      });
      if (!response.ok) {
        return null;
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch {
      return null;
    }
  }
}

function extensionForMime(mimeType: string): string {
  const type = mimeType.toLowerCase().split(";")[0]?.trim() ?? "";
  if (type.includes("mp4") || type.includes("m4a") || type.includes("aac")) {
    return "m4a";
  }
  if (type.includes("ogg")) {
    return "ogg";
  }
  if (type.includes("mpeg") || type.includes("mp3")) {
    return "mp3";
  }
  if (type.includes("wav")) {
    return "wav";
  }
  return "webm";
}
