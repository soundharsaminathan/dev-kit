import { AiProvider } from "@prisma/client";

export const AI_PROVIDER_API_VALUES = ["groq", "gemini", "openai"] as const;
export type AiProviderApiValue = (typeof AI_PROVIDER_API_VALUES)[number];

export function toAiProviderEnum(
  value: string | null | undefined,
): AiProvider | null {
  if (value == null || value === "") return null;
  switch (value.trim().toLowerCase()) {
    case "groq":
      return AiProvider.GROQ;
    case "gemini":
      return AiProvider.GEMINI;
    case "openai":
      return AiProvider.OPENAI;
    default:
      return null;
  }
}

export function toAiProviderApiValue(
  value: AiProvider | null | undefined,
): AiProviderApiValue | null {
  if (!value) return null;
  switch (value) {
    case AiProvider.GROQ:
      return "groq";
    case AiProvider.GEMINI:
      return "gemini";
    case AiProvider.OPENAI:
      return "openai";
    default:
      return null;
  }
}

export function isAiConfigured(settings: {
  aiProvider: AiProvider | null;
  aiApiKey: string | null;
  aiApiKeyIv: string | null;
}): boolean {
  return Boolean(
    settings.aiProvider && settings.aiApiKey && settings.aiApiKeyIv,
  );
}
