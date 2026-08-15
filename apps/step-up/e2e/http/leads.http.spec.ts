import { expect, test } from "@playwright/test";
import { SEED } from "../fixtures/seed";
import { expectOk, expectStatus, TestDataCleanup } from "./helpers";

const STUDIO_ID = SEED.users.OWNER.studioId;

test.describe("trial caller leads HTTP @http", () => {
  test("lists paginated leads for this week @http", async () => {
    const page = await expectOk<{
      items: Array<{ id: string; name: string; section: string }>;
      nextCursor: string | null;
      limit: number;
    }>(
      "STAFF",
      `/users/studio/${STUDIO_ID}/leads?section=trialBooked&filter=thisWeek&limit=25`,
    );

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
      `/users/studio/${STUDIO_ID}/leads?section=trialBooked&from=${todayKey}&to=${todayKey}&limit=25`,
    );

    expect(Array.isArray(page.items)).toBe(true);
    expect(page.limit).toBe(25);
    expect(
      page.nextCursor === null || typeof page.nextCursor === "string",
    ).toBe(true);
  });

  test("lists only leads of the requested section @http", async () => {
    const page = await expectOk<{
      items: Array<{ id: string; section: string }>;
    }>("STAFF", `/users/studio/${STUDIO_ID}/leads?section=left&limit=25`);

    expect(Array.isArray(page.items)).toBe(true);
    expect(page.items.every((item) => item.section === "left")).toBe(true);
  });

  test("ignores date params on sections without a date filter @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const stamp = Date.now();
      const lead = await expectOk<{ id: string }>(
        "STAFF",
        `/users/studio/${STUDIO_ID}/leads`,
        {
          method: "POST",
          body: JSON.stringify({
            name: `HTTP New ${stamp}`,
            phone: `900${String(stamp).slice(-7)}`,
            ageRange: "TWENTY_TO_FORTY",
          }),
        },
      );
      cleanup.trackStudent(lead.id);

      const page = await expectOk<{
        items: Array<{ id: string }>;
      }>(
        "STAFF",
        `/users/studio/${STUDIO_ID}/leads?section=new&from=2026-01-01&to=2026-01-01&q=${encodeURIComponent(`HTTP New ${stamp}`)}&limit=25`,
      );
      expect(page.items.map((item) => item.id)).toContain(lead.id);
    } finally {
      await cleanup.dispose();
    }
  });

  test("rejects an invalid section @http", async () => {
    await expectStatus(
      "STAFF",
      `/users/studio/${STUDIO_ID}/leads?section=unknown`,
      400,
    );
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

  test("staff can archive and unarchive a lead @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const stamp = Date.now();
      const lead = await expectOk<{
        id: string;
        active: boolean;
        section: string;
      }>("STAFF", `/users/studio/${STUDIO_ID}/leads`, {
        method: "POST",
        body: JSON.stringify({
          name: `HTTP Archive ${stamp}`,
          phone: `900${String(stamp).slice(-7)}`,
          ageRange: "TWENTY_TO_FORTY",
        }),
      });
      cleanup.trackStudent(lead.id);
      expect(lead.active).toBe(true);
      expect(lead.section).toBe("new");

      const archived = await expectOk<{ student: { active: boolean } }>(
        "STAFF",
        `/users/studio/${STUDIO_ID}/students/${lead.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ active: false }),
        },
      );
      expect(archived.student.active).toBe(false);

      const unarchived = await expectOk<{ student: { active: boolean } }>(
        "STAFF",
        `/users/studio/${STUDIO_ID}/students/${lead.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ active: true }),
        },
      );
      expect(unarchived.student.active).toBe(true);
    } finally {
      await cleanup.dispose();
    }
  });

  test("staff can record remarks on a lead @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const stamp = Date.now();
      const lead = await expectOk<{
        id: string;
        lastFollowupAt: string | null;
      }>("STAFF", `/users/studio/${STUDIO_ID}/leads`, {
        method: "POST",
        body: JSON.stringify({
          name: `HTTP Remark ${stamp}`,
          phone: `900${String(stamp).slice(-7)}`,
          ageRange: "TWENTY_TO_FORTY",
        }),
      });
      cleanup.trackStudent(lead.id);
      expect(lead.lastFollowupAt).toBeNull();

      const empty = await expectStatus(
        "STAFF",
        `/users/studio/${STUDIO_ID}/leads/${lead.id}/remarks`,
        400,
        {
          method: "POST",
          body: JSON.stringify({ body: "   " }),
        },
      );
      expect(empty.status).toBe(400);

      const created = await expectOk<{
        id: string;
        body: string;
        author: { name: string };
      }>("STAFF", `/users/studio/${STUDIO_ID}/leads/${lead.id}/remarks`, {
        method: "POST",
        body: JSON.stringify({ body: "Called, no answer" }),
      });
      expect(created.body).toBe("Called, no answer");
      expect(created.author.name.length).toBeGreaterThan(0);

      const remarks = await expectOk<Array<{ id: string; body: string }>>(
        "STAFF",
        `/users/studio/${STUDIO_ID}/leads/${lead.id}/remarks`,
      );
      expect(remarks.map((row) => row.body)).toEqual(["Called, no answer"]);

      const page = await expectOk<{
        items: Array<{ id: string; lastFollowupAt: string | null }>;
      }>(
        "STAFF",
        `/users/studio/${STUDIO_ID}/leads?q=${encodeURIComponent(`HTTP Remark ${stamp}`)}&limit=25`,
      );
      const listed = page.items.find((item) => item.id === lead.id);
      expect(listed?.lastFollowupAt).toBeTruthy();
    } finally {
      await cleanup.dispose();
    }
  });

  test("trainer cannot archive a lead @http", async () => {
    await expectStatus(
      "TRAINER",
      `/users/studio/${STUDIO_ID}/students/${SEED.users.STUDENT.id}`,
      403,
      {
        method: "PATCH",
        body: JSON.stringify({ active: false }),
      },
    );
  });

  test("trainer cannot list or add lead remarks @http", async () => {
    await expectStatus(
      "TRAINER",
      `/users/studio/${STUDIO_ID}/leads/${SEED.users.STUDENT.id}/remarks`,
      403,
    );
    await expectStatus(
      "TRAINER",
      `/users/studio/${STUDIO_ID}/leads/${SEED.users.STUDENT.id}/remarks`,
      403,
      {
        method: "POST",
        body: JSON.stringify({ body: "Should not land" }),
      },
    );
  });
});
