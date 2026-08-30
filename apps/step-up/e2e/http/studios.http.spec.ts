import { expect, test } from "@playwright/test";
import { apiBaseUrl, SEED } from "../fixtures/seed";
import { expectOk, expectStatus, httpJson, TestDataCleanup } from "./helpers";

test.describe("studios HTTP @http", () => {
  test("public directory lists studio id and name @http", async () => {
    const response = await fetch(`${apiBaseUrl()}/studios/directory`);
    expect(response.ok).toBeTruthy();
    const data = (await response.json()) as Array<{
      id: string;
      name: string;
    }>;
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
      }),
    );
    expect(data[0]).not.toHaveProperty("owner");
    expect(data[0]).not.toHaveProperty("memberCount");
  });

  test("admin creates studio with temp password and owner must change it @http", async () => {
    const cleanup = new TestDataCleanup();
    const stamp = Date.now();
    const ownerEmail = `http-owner-${stamp}@stepup.dev`;
    const temporaryPassword = `Su-Temp${stamp.toString(36)}xx`;

    try {
      const created = await expectOk<{
        id: string;
        name: string;
        ownerProvisioned: boolean;
        temporaryPassword: string | null;
        owner: { id: string; email: string; name: string };
        setupHint: string | null;
      }>("SYSTEM_ADMIN", "/studios", {
        method: "POST",
        body: JSON.stringify({
          name: `HTTP Studio ${stamp}`,
          ownerEmail,
          ownerName: "HTTP Owner",
          temporaryPassword,
        }),
      });
      cleanup.trackStudio(created.id);

      expect(created.ownerProvisioned).toBe(true);
      expect(created.temporaryPassword).toBe(temporaryPassword);
      expect(created.owner.email.toLowerCase()).toBe(ownerEmail);
      expect(created.setupHint).toMatch(/temporary password/i);

      const before = await httpJson<{
        id: string;
        mustChangePassword: boolean;
        role: string;
      }>("OWNER", "/users/me", {}, { userId: created.owner.id });
      expect(before.ok).toBeTruthy();
      expect(before.data.mustChangePassword).toBe(true);
      expect(before.data.role).toBe("OWNER");

      const cleared = await httpJson<{
        id: string;
        mustChangePassword: boolean;
      }>(
        "OWNER",
        "/auth/password-changed",
        { method: "POST", body: "{}" },
        { userId: created.owner.id },
      );
      expect(cleared.ok).toBeTruthy();
      expect(cleared.data.mustChangePassword).toBe(false);

      const after = await httpJson<{ mustChangePassword: boolean }>(
        "OWNER",
        "/users/me",
        {},
        { userId: created.owner.id },
      );
      expect(after.ok).toBeTruthy();
      expect(after.data.mustChangePassword).toBe(false);
    } finally {
      await cleanup.dispose();
    }
  });

  test("owner can set GST percent and staff cannot @http", async () => {
    const cleanup = new TestDataCleanup();
    const stamp = Date.now();
    const ownerEmail = `http-gst-owner-${stamp}@stepup.dev`;
    const temporaryPassword = `Su-Gst${stamp.toString(36)}xx`;

    try {
      const created = await expectOk<{
        id: string;
        owner: { id: string };
      }>("SYSTEM_ADMIN", "/studios", {
        method: "POST",
        body: JSON.stringify({
          name: `HTTP GST Studio ${stamp}`,
          ownerEmail,
          ownerName: "GST Owner",
          temporaryPassword,
        }),
      });
      cleanup.trackStudio(created.id);

      await expectOk(
        "OWNER",
        "/auth/password-changed",
        { method: "POST", body: "{}" },
        { userId: created.owner.id },
      );

      const saved = await expectOk<{ gstPercent: number }>(
        "OWNER",
        `/studios/${created.id}/settings`,
        {
          method: "PATCH",
          body: JSON.stringify({ gstPercent: 18 }),
        },
        { userId: created.owner.id },
      );
      expect(saved.gstPercent).toBe(18);

      const studio = await expectOk<{
        settings: { gstPercent: number };
      }>("OWNER", `/studios/${created.id}`, undefined, {
        userId: created.owner.id,
      });
      expect(studio.settings.gstPercent).toBe(18);

      const denied = await expectStatus(
        "STAFF",
        `/studios/${SEED.studioId}/settings`,
        403,
        {
          method: "PATCH",
          body: JSON.stringify({ gstPercent: 18 }),
        },
      );
      expect(denied.text).toMatch(/only owners can change gst percent/i);

      const deniedAi = await expectStatus(
        "STAFF",
        `/studios/${SEED.studioId}/settings`,
        403,
        {
          method: "PATCH",
          body: JSON.stringify({
            aiProvider: "groq",
            aiApiKey: "should-not-work",
          }),
        },
      );
      expect(deniedAi.text).toMatch(/only owners can change ai agent settings/i);

      await expectStatus(
        "OWNER",
        `/studios/${created.id}/settings`,
        400,
        {
          method: "PATCH",
          body: JSON.stringify({ gstPercent: 101 }),
        },
        { userId: created.owner.id },
      );
    } finally {
      await cleanup.dispose();
    }
  });
});
