import { expect, SMOKE, test, waitForAppReady } from "./fixtures";

test.describe("public smoke @smoke", () => {
  test("guest public pages render @smoke", async ({ page }) => {
    for (const pathName of [
      "/",
      "/login",
      "/register",
      "/forgot-password",
      "/join",
    ]) {
      await page.goto(pathName, { waitUntil: "domcontentloaded" });
      await waitForAppReady(page);
      await expect(page).not.toHaveURL(/something-went-wrong/);
      await expect
        .poll(async () => {
          return (
            (await page.getByRole("heading").count()) +
            (await page.getByRole("button").count()) +
            (await page.getByRole("link").count())
          );
        })
        .toBeGreaterThan(0);
    }
  });

  test("direct login page has username and password only @smoke", async ({
    page,
  }) => {
    await page.goto("/login?direct=1", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByLabel("Username")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await expect(page.getByTestId("login-studio-select")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Continue with Google" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "New here? Create a student account" }),
    ).toHaveCount(0);
  });

  test("guest is redirected from authed shells to login @smoke", async ({
    page,
  }) => {
    for (const pathName of ["/me", "/app", "/admin"]) {
      await page.goto(pathName, { waitUntil: "domcontentloaded" });
      await waitForAppReady(page);
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test("public entity pages render for seeded ids @smoke", async ({ page }) => {
    const paths = [
      `/studio/${SMOKE.studioId}`,
      `/trainers/${SMOKE.users.TRAINER.id}`,
      `/users/${SMOKE.users.STUDENT.id}`,
      `/posts/${SMOKE.postId}`,
    ];
    for (const pathName of paths) {
      await page.goto(pathName, { waitUntil: "domcontentloaded" });
      await waitForAppReady(page);
      await expect(page).not.toHaveURL(/\/login/);
      const errorCopy = page.getByText(
        /something went wrong|unexpected error/i,
      );
      // Public pages may 404-copy for private profiles; either content or a
      // deliberate empty/not-found state is acceptable — never a crash.
      await expect
        .poll(async () => {
          const interactive =
            (await page.getByRole("heading").count()) +
            (await page.getByRole("button").count()) +
            (await page.getByRole("link").count()) +
            (await page.getByText(/not found|private|unavailable/i).count());
          const crashed = await errorCopy.count();
          return crashed === 0 && interactive > 0 ? "ok" : "bad";
        })
        .toBe("ok");
    }
  });
});
