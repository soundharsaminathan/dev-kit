import { ServiceUnavailableException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GeminiClient } from "./gemini.client";
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
            function: {
              name: "create_lead",
              arguments: JSON.stringify({
                name: "Riya",
                phone: "9000000001",
                ageRange: "TWENTY_TO_FORTY",
              }),
            },
          },
        ],
        model: "gemini-2.5-flash",
      })
      .mockResolvedValueOnce({
        content: "Created lead Riya.",
        toolCalls: [],
        model: "gemini-2.5-flash",
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
          { role: "user", content: "Add lead Riya 9000000001 age 20-40" },
        ],
      },
    );

    expect(result.reply).toBe("Created lead Riya.");
    expect(result.actions).toEqual([
      { tool: "create_lead", ok: true, summary: "Created lead Riya" },
    ]);
    expect(tools.execute).toHaveBeenCalled();
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
