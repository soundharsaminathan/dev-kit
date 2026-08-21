import { expect, test } from "@playwright/test";
import { SEED } from "../fixtures/seed";
import { expectOk, expectStatus, httpJson, TestDataCleanup } from "./helpers";

test.describe("studio features HTTP @http", () => {
  test("system admin can list and toggle features; owner cannot patch @http", async () => {
    const studioId = SEED.studioId;

    const listed = await expectOk<{
      features: Array<{ key: string; enabled: boolean; category: string }>;
    }>("SYSTEM_ADMIN", `/studios/${studioId}/features`);
    expect(listed.features.length).toBeGreaterThanOrEqual(9);
    expect(listed.features.some((f) => f.key === "bookings")).toBe(true);

    const asOwner = await expectOk<{
      features: Array<{ key: string; enabled: boolean }>;
    }>("OWNER", `/studios/${studioId}/features`);
    expect(asOwner.features.some((f) => f.key === "bookings")).toBe(true);

    await expectStatus(
      "OWNER",
      `/studios/${studioId}/features/bookings`,
      403,
      {
        method: "PATCH",
        body: JSON.stringify({ enabled: false }),
      },
    );

    const disabled = await expectOk<{ key: string; enabled: boolean }>(
      "SYSTEM_ADMIN",
      `/studios/${studioId}/features/bookings`,
      {
        method: "PATCH",
        body: JSON.stringify({ enabled: false }),
      },
    );
    expect(disabled.enabled).toBe(false);

    await expectOk("SYSTEM_ADMIN", `/studios/${studioId}/features/chat`, {
      method: "PATCH",
      body: JSON.stringify({ enabled: false }),
    });

    try {
      await expectStatus("OWNER", `/bookings/studio/${studioId}`, 403);

      const chatDenied = await httpJson<{ message?: string }>(
        "OWNER",
        "/chat/conversations",
      );
      expect(chatDenied.status).toBe(403);
      expect(String(chatDenied.data.message ?? chatDenied.data)).toMatch(
        /not available/i,
      );

      await expectOk("SYSTEM_ADMIN", `/studios/${studioId}/features/bookings`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: true }),
      });
      await expectOk("SYSTEM_ADMIN", `/studios/${studioId}/features/chat`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: true }),
      });

      await expectOk("OWNER", `/bookings/studio/${studioId}`);
      await expectOk("OWNER", "/chat/conversations");
    } finally {
      await expectOk("SYSTEM_ADMIN", `/studios/${studioId}/features/bookings`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: true }),
      });
      await expectOk("SYSTEM_ADMIN", `/studios/${studioId}/features/chat`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: true }),
      });
    }
  });

  test("feature toggles are isolated per studio @http", async () => {
    const cleanup = new TestDataCleanup();
    const stamp = Date.now();
    try {
      const created = await expectOk<{ id: string }>("SYSTEM_ADMIN", "/studios", {
        method: "POST",
        body: JSON.stringify({
          name: `Features Studio ${stamp}`,
          ownerEmail: `features-owner-${stamp}@stepup.dev`,
          ownerName: "Features Owner",
          temporaryPassword: `Su-Feat${stamp.toString(36)}xx`,
        }),
      });
      cleanup.trackStudio(created.id);

      await expectOk(
        "SYSTEM_ADMIN",
        `/studios/${created.id}/features/contests`,
        {
          method: "PATCH",
          body: JSON.stringify({ enabled: false }),
        },
      );

      const seedFeatures = await expectOk<{
        features: Array<{ key: string; enabled: boolean }>;
      }>("SYSTEM_ADMIN", `/studios/${SEED.studioId}/features`);
      expect(
        seedFeatures.features.find((f) => f.key === "contests")?.enabled,
      ).toBe(true);

      const other = await expectOk<{
        features: Array<{ key: string; enabled: boolean }>;
      }>("SYSTEM_ADMIN", `/studios/${created.id}/features`);
      expect(other.features.find((f) => f.key === "contests")?.enabled).toBe(
        false,
      );
    } finally {
      await cleanup.dispose();
    }
  });

  test("disabled payments blocks checkout order but not invoice list @http", async () => {
    const studioId = SEED.studioId;
    await expectOk(
      "SYSTEM_ADMIN",
      `/studios/${studioId}/features/payments`,
      {
        method: "PATCH",
        body: JSON.stringify({ enabled: false }),
      },
    );
    try {
      await expectOk("OWNER", `/billing/studio/${studioId}`);
      await expectStatus(
        "OWNER",
        `/billing/analytics/trainer/${SEED.users.TRAINER.id}?studioId=${studioId}`,
        403,
      );
    } finally {
      await expectOk(
        "SYSTEM_ADMIN",
        `/studios/${studioId}/features/payments`,
        {
          method: "PATCH",
          body: JSON.stringify({ enabled: true }),
        },
      );
    }
  });

  test("wrong role still returns insufficient permissions when feature is on @http", async () => {
    await expectStatus(
      "STUDENT",
      `/bookings/studio/${SEED.studioId}`,
      403,
    );
    const denied = await httpJson(
      "STUDENT",
      `/bookings/studio/${SEED.studioId}`,
    );
    expect(String((denied.data as { message?: string }).message ?? denied.data)).toMatch(
      /Insufficient permissions/i,
    );
  });
});
