import { expect, test } from "@playwright/test";
import { SEED } from "../fixtures/seed";
import { expectOk, expectStatus } from "./helpers";

test.describe("batches HTTP @http", () => {
  test("staff creates and removes a trial batch @http", async () => {
    const stamp = Date.now();
    const name = `HTTP Trial ${stamp}`;
    // Far-future unique slot avoids seed schedule conflicts on branch-main-1.
    const created = await expectOk<{
      id: string;
      name: string;
      isTrial: boolean;
    }>("STAFF", "/batches", {
      method: "POST",
      body: JSON.stringify({
        studioId: SEED.users.STAFF.studioId,
        name,
        coverImageUrl:
          "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80",
        category: "ADULTS",
        branchId: "branch-main-1",
        trainerIds: [SEED.users.TRAINER.id],
        danceCategories: [
          { name: "Hip Hop", description: "HTTP integration batch" },
        ],
        scheduleJson: {
          frequency: "WEEKLY",
          weekdays: [0],
          startDate: "2027-01-03",
          endDate: "2027-03-28",
          startTime: "06:15",
          endTime: "07:00",
          utcOffsetMinutes: 0,
        },
        capacity: 8,
        enrollmentMode: "SELF_JOIN",
        subscriptionIds: [],
        active: true,
        isTrial: true,
        certificationEnabled: false,
      }),
    });

    expect(created.id).toBeTruthy();
    expect(created.name).toBe(name);

    await expectOk("STAFF", `/batches/${created.id}`, { method: "DELETE" });
  });

  test("student cannot create a batch @http", async () => {
    await expectStatus("STUDENT", "/batches", 403, {
      method: "POST",
      body: JSON.stringify({
        studioId: SEED.users.STUDENT.studioId,
        name: "Forbidden batch",
        category: "ADULTS",
        branchId: "branch-main-1",
        trainerIds: [SEED.users.TRAINER.id],
        danceCategories: [{ name: "Hip Hop", description: "Nope" }],
        scheduleJson: {
          frequency: "WEEKLY",
          weekdays: [1],
          startDate: "2026-07-01",
          endDate: "2026-12-31",
          startTime: "18:00",
          endTime: "19:00",
          utcOffsetMinutes: 0,
        },
        capacity: 10,
        enrollmentMode: "SELF_JOIN",
        subscriptionIds: [],
        isTrial: true,
      }),
    });
  });
});
