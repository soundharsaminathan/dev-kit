import { ServiceUnavailableException } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GeminiClient, toGeminiContents } from "./gemini.client";
import { StaffAgentService } from "./staff-agent.service";

describe("StaffAgentService", () => {
  const gemini = {
    requireApiKey: vi.fn(),
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
    service = new StaffAgentService(gemini as never, tools as never);
  });

  it("throws 503 when GEMINI_API_KEY is missing", async () => {
    gemini.requireApiKey.mockImplementation(() => {
      throw new ServiceUnavailableException(
        "Staff agent is unavailable: GEMINI_API_KEY is not configured",
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
  });

  it("runs a tool loop then returns the assistant reply", async () => {
    gemini.requireApiKey.mockReturnValue("test-key");
    gemini.chat
      .mockResolvedValueOnce({
        content: null,
        toolCalls: [
          {
            id: "call-1",
            type: "function",
            thoughtSignature: "sig-abc",
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
        model: "gemini-3.6-flash",
      })
      .mockResolvedValueOnce({
        content: "Created lead Riya.",
        toolCalls: [],
        model: "gemini-3.6-flash",
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
    expect(result.actions).toEqual([
      { tool: "create_lead", ok: true, summary: "Created lead Riya" },
    ]);
    expect(tools.execute).toHaveBeenCalled();
    const secondChatMessages = gemini.chat.mock.calls[1]?.[0]?.messages ?? [];
    const assistantWithTools = secondChatMessages.find(
      (m: { role: string; tool_calls?: unknown[] }) =>
        m.role === "assistant" && Array.isArray(m.tool_calls),
    );
    expect(assistantWithTools?.tool_calls?.[0]?.thoughtSignature).toBe(
      "sig-abc",
    );
  });
});

describe("GeminiClient.requireApiKey", () => {
  it("throws when key is empty", () => {
    const client = new GeminiClient({
      get: () => "",
    } as never);
    expect(() => client.requireApiKey()).toThrow(ServiceUnavailableException);
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

    const client = new GeminiClient({
      get: (key: string) =>
        key === "GEMINI_API_KEY" ? "test-key" : undefined,
    } as never);

    const result = await client.chat({
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
});
