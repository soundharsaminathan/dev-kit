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

  test("rejects an unknown trial caller date filter @http", async () => {
    await expectStatus(
      "STAFF",
      `/users/studio/${STUDIO_ID}/leads?filter=this_week`,
      400,
    );
  });
});
