import {
  apiRequest,
  expect,
  TestDataCleanup,
  test,
  waitForApiResponse,
  waitForAppReady,
} from "../fixtures";
import { AUTH_STORAGE_KEY, SEED } from "../fixtures/seed";

type SyncedStudent = {
  id: string;
  email: string;
  name: string;
  role: "STUDENT";
  studioId: string | null;
  onboardingCompletedAt: string | null;
};

async function createIncompleteStudent(label: string) {
  const stamp = Date.now();
  const id = `dev-signup-onboarding-${stamp}-${label}`;
  const email = `onboarding-${stamp}-${label}@stepup.dev`;
  return apiRequest<SyncedStudent>("OWNER", "/auth/sync", {
    method: "POST",
    headers: {
      Authorization: `Bearer dev:STUDENT:${id}`,
    },
    body: JSON.stringify({
      name: "New User",
      email,
      create: true,
      studioId: SEED.studioId,
    }),
  });
}

test.describe("onboarding wizard @critical", () => {
  test("new student completes every step and lands on discover @critical", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const cleanup = new TestDataCleanup();
    const student = await createIncompleteStudent("walk");
    cleanup.trackStudent(student.id);
    expect(student.onboardingCompletedAt).toBeNull();

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto("/login");
      await page.evaluate(
        ({ key, value }) => {
          localStorage.setItem(key, JSON.stringify(value));
        },
        {
          key: AUTH_STORAGE_KEY,
          value: {
            id: student.id,
            email: student.email,
            name: student.name,
            role: "STUDENT",
            studioId: student.studioId,
            styles: [],
            experienceLevel: null,
            gender: null,
            ageRange: null,
            onboardingCompletedAt: null,
          },
        },
      );

      await page.goto("/me");
      await waitForAppReady(page);
      await expect(page).toHaveURL(/\/me\/onboarding/);

      await expect(
        page.getByRole("heading", { name: /Show up/i }),
      ).toBeVisible();
      await page.getByLabel(/Display name/i).fill("Onboarding Walker");
      await page.getByRole("button", { name: /^Female$/i }).click();
      await page.getByLabel(/^age$/i).fill("28");

      const [profilePatch] = await Promise.all([
        waitForApiResponse(page, {
          method: "PATCH",
          pathIncludes: "/users/me",
        }),
        page.getByRole("button", { name: "Continue" }).click(),
      ]);
      expect(profilePatch.ok()).toBeTruthy();

      await expect(
        page.getByRole("heading", { name: /Where are/i }),
      ).toBeVisible();
      await page.getByRole("button", { name: /Brand new/i }).click();

      const [levelPatch] = await Promise.all([
        waitForApiResponse(page, {
          method: "PATCH",
          pathIncludes: "/users/me",
        }),
        page.getByRole("button", { name: "Continue" }).click(),
      ]);
      expect(levelPatch.ok()).toBeTruthy();

      await expect(page.getByRole("heading", { name: /Try/i })).toBeVisible();
      await page.getByRole("button", { name: /^Skip$/i }).click();

      await expect(page.getByRole("heading", { name: /Any/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /^Skip$/i })).toBeVisible();

      const [completeResponse] = await Promise.all([
        waitForApiResponse(page, {
          method: "POST",
          pathIncludes: "/users/me/onboarding/complete",
        }),
        page.getByRole("button", { name: /^Skip$/i }).click(),
      ]);
      expect(completeResponse.ok()).toBeTruthy();

      await expect(page).toHaveURL(/\/me\/book/);
      await waitForAppReady(page);

      await page.goto("/me/onboarding");
      await waitForAppReady(page);
      await expect(page).toHaveURL(/\/me\/?$/);
    } finally {
      await context.close();
      await cleanup.dispose();
    }
  });
});
