import { randomUUID } from "node:crypto";
import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  AgentChatMessage,
  AgentToolCall,
  AgentToolDefinition,
} from "./agent.types";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

/** Default chat model — supports tool calling and audio input on the free tier. */
export const GEMINI_CHAT_MODEL_DEFAULT = "gemini-2.5-flash";
export const GEMINI_TTS_MODEL_DEFAULT = "gemini-2.5-flash-preview-tts";
export const GEMINI_TTS_VOICE_DEFAULT = "Kore";

type GeminiPart =
  | { text: string }
  | {
      inlineData: { mimeType: string; data: string };
    }
  | {
      functionCall: {
        id?: string;
        name: string;
        args: Record<string, unknown>;
      };
    }
  | {
      functionResponse: {
        id?: string;
        name: string;
        response: Record<string, unknown>;
      };
    };

type GeminiContent = {
  role: "user" | "model";
  parts: GeminiPart[];
};

type GenerateContentResponse = {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
  }>;
  error?: { message?: string };
};

@Injectable()
export class GeminiClient {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  getApiKey(): string | null {
    const key = this.config.get<string>("GEMINI_API_KEY")?.trim();
    return key || null;
  }

  requireApiKey(): string {
    const key = this.getApiKey();
    if (!key) {
      throw new ServiceUnavailableException(
        "Staff agent is unavailable: GEMINI_API_KEY is not configured",
      );
    }
    return key;
  }

  chatModel(): string {
    return (
      this.config.get<string>("GEMINI_CHAT_MODEL")?.trim() ||
      GEMINI_CHAT_MODEL_DEFAULT
    );
  }

  ttsModel(): string {
    return (
      this.config.get<string>("GEMINI_TTS_MODEL")?.trim() ||
      GEMINI_TTS_MODEL_DEFAULT
    );
  }

  ttsVoice(): string {
    return (
      this.config.get<string>("GEMINI_TTS_VOICE")?.trim() ||
      GEMINI_TTS_VOICE_DEFAULT
    );
  }

  async chat(input: {
    messages: AgentChatMessage[];
    tools?: AgentToolDefinition[];
    temperature?: number;
    maxTokens?: number;
  }): Promise<{
    content: string | null;
    toolCalls: AgentToolCall[];
    model: string;
  }> {
    const apiKey = this.requireApiKey();
    const model = this.chatModel();
    const { systemInstruction, contents } = toGeminiContents(input.messages);

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: input.temperature ?? 0.2,
        maxOutputTokens: input.maxTokens ?? 1024,
      },
    };

    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    if (input.tools && input.tools.length > 0) {
      body.tools = [
        {
          functionDeclarations: input.tools.map((tool) => ({
            name: tool.function.name,
            description: tool.function.description,
            parameters: tool.function.parameters,
          })),
        },
      ];
      body.toolConfig = {
        functionCallingConfig: { mode: "AUTO" },
      };
    }

    const data = await this.generateContent(apiKey, model, body);
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const text = parts
      .filter((part): part is { text: string } => "text" in part)
      .map((part) => part.text)
      .join("")
      .trim();

    const toolCalls: AgentToolCall[] = parts
      .filter(
        (
          part,
        ): part is {
          functionCall: {
            id?: string;
            name: string;
            args: Record<string, unknown>;
          };
        } => "functionCall" in part,
      )
      .map((part) => ({
        id: part.functionCall.id ?? randomUUID(),
        type: "function" as const,
        function: {
          name: part.functionCall.name,
          arguments: JSON.stringify(part.functionCall.args ?? {}),
        },
      }));

    return {
      content: text || null,
      toolCalls,
      model,
    };
  }

  async transcribe(audio: Buffer, mimeType: string): Promise<string> {
    const apiKey = this.requireApiKey();
    const model = this.chatModel();

    const data = await this.generateContent(apiKey, model, {
      systemInstruction: {
        parts: [
          {
            text: "Transcribe the audio verbatim. Return only the spoken words with no commentary.",
          },
        ],
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType,
                data: audio.toString("base64"),
              },
            },
            { text: "Transcribe this recording." },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 1024,
      },
    });

    const parts = data.candidates?.[0]?.content?.parts ?? [];
    return parts
      .filter((part): part is { text: string } => "text" in part)
      .map((part) => part.text)
      .join("")
      .trim();
  }

  async synthesizeSpeech(text: string): Promise<Buffer | null> {
    const apiKey = this.getApiKey();
    const trimmed = text.trim().slice(0, 2000);
    if (!apiKey || !trimmed) {
      return null;
    }

    try {
      const model = this.ttsModel();
      const data = await this.generateContent(apiKey, model, {
        contents: [{ parts: [{ text: trimmed }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: this.ttsVoice() },
            },
          },
        },
      });

      const pcmBase64 = data.candidates?.[0]?.content?.parts?.find(
        (part): part is { inlineData: { mimeType: string; data: string } } =>
          "inlineData" in part,
      )?.inlineData.data;

      if (!pcmBase64) {
        return null;
      }

      const pcm = Buffer.from(pcmBase64, "base64");
      return pcm.length > 0 ? pcmToWav(pcm) : null;
    } catch {
      return null;
    }
  }

  private async generateContent(
    apiKey: string,
    model: string,
    body: Record<string, unknown>,
  ): Promise<GenerateContentResponse> {
    const response = await fetch(
      `${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    const data = (await response.json()) as GenerateContentResponse;
    if (!response.ok) {
      throw new ServiceUnavailableException(
        data.error?.message ?? "Gemini request failed",
      );
    }
    return data;
  }
}

function toGeminiContents(messages: AgentChatMessage[]): {
  systemInstruction?: string;
  contents: GeminiContent[];
} {
  let systemInstruction: string | undefined;
  const contents: GeminiContent[] = [];
  const callNames = new Map<string, string>();
  let pendingToolParts: GeminiPart[] = [];

  function flushToolParts() {
    if (pendingToolParts.length === 0) {
      return;
    }
    contents.push({ role: "user", parts: pendingToolParts });
    pendingToolParts = [];
  }

  for (const message of messages) {
    if (message.role === "system") {
      systemInstruction = message.content ?? "";
      continue;
    }

    if (message.role === "tool") {
      const name = callNames.get(message.tool_call_id ?? "") ?? "unknown";
      let response: Record<string, unknown>;
      try {
        const parsed = JSON.parse(message.content ?? "{}") as unknown;
        response =
          parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>)
            : { result: message.content };
      } catch {
        response = { result: message.content ?? "" };
      }
      pendingToolParts.push({
        functionResponse: {
          id: message.tool_call_id,
          name,
          response,
        },
      });
      continue;
    }

    flushToolParts();

    if (message.role === "user") {
      contents.push({
        role: "user",
        parts: [{ text: message.content ?? "" }],
      });
      continue;
    }

    const parts: GeminiPart[] = [];
    if (message.content) {
      parts.push({ text: message.content });
    }
    for (const call of message.tool_calls ?? []) {
      callNames.set(call.id, call.function.name);
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments || "{}") as Record<
          string,
          unknown
        >;
      } catch {
        args = {};
      }
      parts.push({
        functionCall: {
          id: call.id,
          name: call.function.name,
          args,
        },
      });
    }
    contents.push({ role: "model", parts });
  }

  flushToolParts();
  return { systemInstruction, contents };
}

function pcmToWav(
  pcm: Buffer,
  sampleRate = 24_000,
  channels = 1,
  bitsPerSample = 16,
): Buffer {
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
