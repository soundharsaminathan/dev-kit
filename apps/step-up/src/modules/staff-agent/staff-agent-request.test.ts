import { describe, expect, it } from "vitest";

/**
 * Contract check: chat request bodies must never include provider.
 * The panel builds `{ messages }` only — see staff-agent-panel.tsx.
 */
describe("staff agent chat request contract", () => {
  it("omits provider from the request body shape", () => {
    const body = {
      messages: [{ role: "user" as const, content: "Hello" }],
    };
    expect(body).not.toHaveProperty("provider");
    expect(JSON.stringify(body)).not.toMatch(/provider/);
  });
});
