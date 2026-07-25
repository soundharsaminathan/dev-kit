import { expect, test } from "@playwright/test";
import { SEED } from "../fixtures/seed";
import { expectOk, expectStatus } from "./helpers";

const STUDIO_ID = SEED.users.OWNER.studioId;

test.describe("funnel and authz HTTP @http", () => {
  test("owner can read funnel counts @http", async () => {
    const counts = await expectOk<{
      total: number;
      active: number;
      period: string;
    }>("OWNER", `/users/studio/${STUDIO_ID}/student-funnel?period=lifetime`);

    expect(counts.total).toBeGreaterThan(0);
    expect(typeof counts.active).toBe("number");
  });

  test("owner can create a student @http", async () => {
    const email = `http-student-${Date.now()}@stepup.dev`;
    const created = await expectOk<{ id: string; email: string }>(
      "OWNER",
      "/users",
      {
        method: "POST",
        body: JSON.stringify({
          name: "HTTP Student",
          email,
          gender: "FEMALE",
          ageRange: "TWENTY_TO_FORTY",
          styles: ["Hip Hop"],
        }),
      },
    );

    expect(created.id).toBeTruthy();
    expect(created.email.toLowerCase()).toBe(email);
  });

  test("student cannot access staff billing list @http", async () => {
    await expectStatus(
      "STUDENT",
      `/billing/studio/${SEED.users.STUDENT.studioId}`,
      403,
    );
  });
});
