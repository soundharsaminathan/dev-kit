import { ServiceUnavailableException } from "@nestjs/common";
import { AiProvider } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AI_KEY_REJECTED_MESSAGE } from "./ai-errors";
import { GeminiClient, toGeminiContents } from "./gemini.client";
import { GroqClient, toGroqMessages } from "./groq.client";
import { StaffAgentService } from "./staff-agent.service";

describe("StaffAgentService", () => {
  const prisma = {
    studioSettings: {
      findUnique: vi.fn(),
    },
  };
  const agentConfig = {
    resolve: vi.fn(),
  };
  const groq = {
    chat: vi.fn(),
    transcribe: vi.fn(),
    synthesizeSpeech: vi.fn(),
  };
  const gemini = {
    chat: vi.fn(),
    transcribe: vi.fn(),
    synthesizeSpeech: vi.fn(),
  };
  const openai = {
    chat: vi.fn(),
    transcribe: vi.fn(),
    synthesizeSpeech: vi.fn(),
  };
  const tools = {
    execute: vi.fn(),
  };

  let service: StaffAgentService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new StaffAgentService(
      prisma as never,
      agentConfig as never,
      groq as never,
      gemini as never,
      openai as never,
      tools as never,
    );
  });

  it("throws 503 when studio AI is not configured", async () => {
    prisma.studioSettings.findUnique.mockResolvedValue(null);
    agentConfig.resolve.mockImplementation(() => {
      throw new ServiceUnavailableException(
        "AI agent is not configured for this studio.",
      );
    });

    await expect(
      service.chat(
        {
          id: "staff-1",
          role: "STAFF",
          studioId: "studio-1",
        } as never,
        { messages: [{ role: "user", content: "Add a lead named Riya" }] },
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(groq.chat).not.toHaveBeenCalled();
    expect(gemini.chat).not.toHaveBeenCalled();
  });

  it("uses Gemini when studio settings say gemini", async () => {
    prisma.studioSettings.findUnique.mockResolvedValue({
      aiProvider: AiProvider.GEMINI,
      aiApiKey: "sealed",
      aiApiKeyIv: "iv",
      aiChatModel: null,
    });
    agentConfig.resolve.mockReturnValue({
      provider: "gemini",
      apiKey: "studio-gemini",
      chatModel: null,
    });
    gemini.chat.mockResolvedValue({
      content: "Hello from Gemini.",
      toolCalls: [],
      model: "gemini-3.6-flash",
    });

    const result = await service.chat(
      {
        id: "staff-1",
        role: "STAFF",
        studioId: "studio-1",
      } as never,
      {
        messages: [{ role: "user", content: "Say hello" }],
      },
    );

    expect(result.provider).toBe("gemini");
    expect(result.reply).toBe("Hello from Gemini.");
    expect(groq.chat).not.toHaveBeenCalled();
    expect(gemini.chat).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: "studio-gemini" }),
    );
  });

  it("uses OpenAI when studio settings say openai", async () => {
    prisma.studioSettings.findUnique.mockResolvedValue({
      aiProvider: AiProvider.OPENAI,
      aiApiKey: "sealed",
      aiApiKeyIv: "iv",
      aiChatModel: null,
    });
    agentConfig.resolve.mockReturnValue({
      provider: "openai",
      apiKey: "studio-openai",
      chatModel: null,
    });
    openai.chat.mockResolvedValue({
      content: "Hello from OpenAI.",
      toolCalls: [],
      model: "gpt-4o-mini",
    });

    const result = await service.chat(
      {
        id: "staff-1",
        role: "STAFF",
        studioId: "studio-1",
      } as never,
      { messages: [{ role: "user", content: "Say hello" }] },
    );

    expect(result.provider).toBe("openai");
    expect(openai.chat).toHaveBeenCalled();
    expect(groq.chat).not.toHaveBeenCalled();
  });

  it("runs a tool loop then returns the assistant reply", async () => {
    prisma.studioSettings.findUnique.mockResolvedValue({
      aiProvider: AiProvider.GROQ,
      aiApiKey: "sealed",
      aiApiKeyIv: "iv",
      aiChatModel: null,
    });
    agentConfig.resolve.mockReturnValue({
      provider: "groq",
      apiKey: "studio-groq",
      chatModel: null,
    });
    groq.chat
      .mockResolvedValueOnce({
        content: null,
        toolCalls: [
          {
            id: "call-1",
            type: "function",
            function: {
              name: "create_lead",
              arguments: JSON.stringify({
                name: "Riya",
                phone: "9000000001",
                age: 25,
              }),
            },
          },
        ],
        model: "openai/gpt-oss-120b",
      })
      .mockResolvedValueOnce({
        content: "Created lead Riya.",
        toolCalls: [],
        model: "openai/gpt-oss-120b",
      });
    tools.execute.mockResolvedValue({
      content: JSON.stringify({ id: "lead-1", name: "Riya" }),
      action: { tool: "create_lead", ok: true, summary: "Created lead Riya" },
    });

    const result = await service.chat(
      {
        id: "staff-1",
        role: "STAFF",
        studioId: "studio-1",
      } as never,
      {
        messages: [
          { role: "user", content: "Add lead Riya 9000000001 age 25" },
        ],
      },
    );

    expect(result.reply).toBe("Created lead Riya.");
    expect(result.provider).toBe("groq");
    expect(result.actions).toEqual([
      { tool: "create_lead", ok: true, summary: "Created lead Riya" },
    ]);
    expect(tools.execute).toHaveBeenCalled();
  });
});

describe("toGroqMessages tool turns", () => {
  it("maps assistant tool_calls and tool responses", () => {
    const messages = toGroqMessages([
      { role: "user", content: "Add lead GuruRam" },
      {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call-1",
            type: "function",
            function: {
              name: "search_people",
              arguments: JSON.stringify({ q: "GuruRam" }),
            },
          },
        ],
      },
      {
        role: "tool",
        tool_call_id: "call-1",
        content: JSON.stringify({ matches: [] }),
      },
    ]);

    expect(messages[1]).toEqual({
      role: "assistant",
      content: null,
      tool_calls: [
        {
          id: "call-1",
          type: "function",
          function: {
            name: "search_people",
            arguments: JSON.stringify({ q: "GuruRam" }),
          },
        },
      ],
    });
    expect(messages[2]).toEqual({
      role: "tool",
      tool_call_id: "call-1",
      content: JSON.stringify({ matches: [] }),
    });
  });
});

describe("toGeminiContents thought signatures", () => {
  it("echoes thoughtSignature on model functionCall parts", () => {
    const { contents } = toGeminiContents([
      { role: "user", content: "Add lead GuruRam 9898989696 age 29" },
      {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call-1",
            type: "function",
            thoughtSignature: "sig-search-1",
            function: {
              name: "search_people",
              arguments: JSON.stringify({ q: "GuruRam" }),
            },
          },
        ],
      },
      {
        role: "tool",
        tool_call_id: "call-1",
        content: JSON.stringify({ matches: [] }),
      },
    ]);

    const modelTurn = contents.find((c) => c.role === "model");
    expect(modelTurn?.parts).toEqual([
      {
        functionCall: {
          id: "call-1",
          name: "search_people",
          args: { q: "GuruRam" },
        },
        thoughtSignature: "sig-search-1",
      },
    ]);
  });
});

describe("GeminiClient.chat preserves thoughtSignature from API", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("maps part-level thoughtSignature onto tool calls", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  functionCall: {
                    name: "search_people",
                    args: { q: "GuruRam" },
                  },
                  thoughtSignature: "sig-from-api",
                },
              ],
            },
          },
        ],
      }),
    }) as never;

    const client = new GeminiClient();

    const result = await client.chat({
      apiKey: "test-key",
      messages: [{ role: "user", content: "Add lead GuruRam" }],
      tools: [
        {
          type: "function",
          function: {
            name: "search_people",
            description: "Search",
            parameters: { type: "object", properties: {} },
          },
        },
      ],
    });

    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0]?.thoughtSignature).toBe("sig-from-api");
    expect(result.toolCalls[0]?.function.name).toBe("search_people");
  });

  it("maps 401 to a safe key-rejected message", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: "secret-key-xyz" } }),
    }) as never;

    const client = new GroqClient();
    await expect(
      client.chat({
        apiKey: "bad-key",
        messages: [{ role: "user", content: "Hi" }],
      }),
    ).rejects.toMatchObject({
      message: AI_KEY_REJECTED_MESSAGE,
    });
  });
});
