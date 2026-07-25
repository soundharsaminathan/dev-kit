import {
  apiRequest,
  authFile,
  expect,
  test,
  waitForAppReady,
} from "../fixtures";

test.describe("chat send", () => {
  test("student can open messages and load a conversation", async ({
    browser,
  }) => {
    const conversations = await apiRequest<
      Array<{ id: string; title?: string | null }>
    >("STUDENT", "/chat/conversations").catch(() => []);

    const context = await browser.newContext({
      storageState: authFile("STUDENT"),
    });
    const page = await context.newPage();
    await page.goto("/me/messages", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/me\/messages/);

    if (conversations[0]?.id) {
      await page.goto(`/me/messages/${conversations[0].id}`, {
        waitUntil: "domcontentloaded",
      });
      await waitForAppReady(page);
      await expect(page).toHaveURL(
        new RegExp(`/me/messages/${conversations[0].id}`),
      );
      await expect(
        page
          .getByRole("textbox")
          .or(page.getByPlaceholder(/message|type/i))
          .or(page.getByRole("button", { name: /send/i }))
          .first(),
      ).toBeVisible();
    } else {
      await expect(
        page.getByText(/message|chat|inbox|conversation|empty/i).first(),
      ).toBeVisible();
    }

    await context.close();
  });
});
