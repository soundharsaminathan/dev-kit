import { expect, test } from "@playwright/test";
import { SEED } from "../fixtures/seed";
import { expectOk, expectStatus } from "./helpers";

const STUDIO_ID = SEED.users.OWNER.studioId;

test.describe("trial caller leads HTTP @http", () => {
  test("lists paginated leads for this week @http", async () => {
    const page = await expectOk<{
      items: Array<{ id: string; name: string; section: string }>;
      nextCursor: string | null;
      limit: number;
    }>("STAFF", `/users/studio/${STUDIO_ID}/leads?filter=thisWeek&limit=25`);

    expect(Array.isArray(page.items)).toBe(true);
    expect(page.limit).toBe(25);
    expect(
      page.nextCursor === null || typeof page.nextCursor === "string",
    ).toBe(true);
  });

  test("lists leads for a custom date range @http", async () => {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(
      today.getMonth() + 1,
    ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const page = await expectOk<{
      items: Array<{ id: string; name: string; section: string }>;
      nextCursor: string | null;
      limit: number;
    }>(
      "STAFF",
      `/users/studio/${STUDIO_ID}/leads?from=${todayKey}&to=${todayKey}&limit=25`,
    );

    expect(Array.isArray(page.items)).toBe(true);
    expect(page.limit).toBe(25);
    expect(
      page.nextCursor === null || typeof page.nextCursor === "string",
    ).toBe(true);
  });

  test("rejects an unknown trial caller date filter @http", async () => {
    await expectStatus(
      "STAFF",
      `/users/studio/${STUDIO_ID}/leads?filter=this_week`,
      400,
    );
  });

  test("rejects an invalid or inverted date range @http", async () => {
    await expectStatus(
      "STAFF",
      `/users/studio/${STUDIO_ID}/leads?from=2026-02-31&to=2026-08-16`,
      400,
    );
    await expectStatus(
      "STAFF",
      `/users/studio/${STUDIO_ID}/leads?from=2026-08-16&to=2026-08-10`,
      400,
    );
  });
});
