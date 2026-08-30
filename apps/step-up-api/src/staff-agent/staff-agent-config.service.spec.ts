import { ServiceUnavailableException } from "@nestjs/common";
import { AiProvider } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffAgentConfigService } from "./staff-agent-config.service";

describe("StaffAgentConfigService", () => {
  const crypto = {
    decryptStudioSecret: vi.fn(),
  };

  let service: StaffAgentConfigService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new StaffAgentConfigService(crypto as never);
  });

  it("resolves studio Groq credentials", () => {
    crypto.decryptStudioSecret.mockReturnValue(" studio-groq-key ");
    const config = service.resolve({
      aiProvider: AiProvider.GROQ,
      aiApiKey: "sealed",
      aiApiKeyIv: "iv",
      aiChatModel: "custom-model",
    });
    expect(config).toEqual({
      provider: "groq",
      apiKey: "studio-groq-key",
      chatModel: "custom-model",
    });
  });

  it("resolves studio Gemini credentials", () => {
    crypto.decryptStudioSecret.mockReturnValue("gemini-key");
    expect(
      service.resolve({
        aiProvider: AiProvider.GEMINI,
        aiApiKey: "sealed",
        aiApiKeyIv: "iv",
        aiChatModel: null,
      }).provider,
    ).toBe("gemini");
  });

  it("resolves studio OpenAI credentials", () => {
    crypto.decryptStudioSecret.mockReturnValue("openai-key");
    expect(
      service.resolve({
        aiProvider: AiProvider.OPENAI,
        aiApiKey: "sealed",
        aiApiKeyIv: "iv",
        aiChatModel: null,
      }).provider,
    ).toBe("openai");
  });

  it("throws when studio key is missing", () => {
    expect(() => service.resolve(null)).toThrow(ServiceUnavailableException);
    expect(() =>
      service.resolve({
        aiProvider: AiProvider.GROQ,
        aiApiKey: null,
        aiApiKeyIv: null,
        aiChatModel: null,
      }),
    ).toThrow(/not configured/i);
  });

  it("throws when decrypt fails", () => {
    crypto.decryptStudioSecret.mockImplementation(() => {
      throw new Error("bad");
    });
    expect(() =>
      service.resolve({
        aiProvider: AiProvider.GROQ,
        aiApiKey: "sealed",
        aiApiKeyIv: "iv",
        aiChatModel: null,
      }),
    ).toThrow(/not configured/i);
  });
});
