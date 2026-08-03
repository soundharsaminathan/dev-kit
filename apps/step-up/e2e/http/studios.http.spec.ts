import { expect, test } from "@playwright/test";
import { expectOk, httpJson, TestDataCleanup } from "./helpers";

test.describe("studios HTTP @http", () => {
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
});
