import { expect, test } from "@playwright/test";
import { expectStatus, httpJson } from "./helpers";

test.describe("staff agent HTTP @http", () => {
  test("STUDENT cannot use staff agent @http", async () => {
    await expectStatus("STUDENT", "/staff-agent/chat", 403, {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "Add a lead named Riya" }],
      }),
    });
  });

  test("TRAINER cannot use staff agent @http", async () => {
    await expectStatus("TRAINER", "/staff-agent/chat", 403, {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "Add a lead named Riya" }],
      }),
    });
  });

  test("STAFF gets 503 without GEMINI_API_KEY or succeeds when configured @http", async () => {
    const result = await httpJson<{
      reply?: string;
      message?: string | string[];
      actions?: unknown[];
    }>("STAFF", "/staff-agent/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: "Say hello without changing any CRM data.",
          },
        ],
      }),
    });

    // CI typically has no GEMINI_API_KEY → 503. Local/dev with a key → 200.
    if (result.status === 503) {
      const message = Array.isArray(result.data.message)
        ? result.data.message.join(" ")
        : String(result.data.message ?? result.text);
      expect(message.toLowerCase()).toContain("gemini");
      return;
    }

    expect(result.status).toBe(200);
    expect(typeof result.data.reply).toBe("string");
    expect(Array.isArray(result.data.actions)).toBe(true);
  });

  test("rejects empty chat body for STAFF @http", async () => {
    const result = await httpJson("STAFF", "/staff-agent/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [] }),
    });
    // 400 validation / business rule, or 503 when key missing (checked first)
    expect([400, 503]).toContain(result.status);
  });
});
