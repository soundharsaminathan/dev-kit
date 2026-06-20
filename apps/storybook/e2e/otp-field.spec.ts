import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-otpfield--default",
  separator: "components-otpfield--separator",
} as const;

test.describe("OTPField", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "otp-field-default.png",
      );
    });

    test("separator", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.separator,
        "otp-field-separator.png",
      );
    });
  });

  test.describe("interactions", () => {
    test("separator layout accepts digit input", async ({ page }) => {
      await gotoStory(page, STORIES.separator);

      const inputs = page.getByRole("textbox");
      await expect(inputs).toHaveCount(6);

      await inputs.first().fill("1");
      await expect(inputs.first()).toHaveValue("1");
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("separator variant exposes grouped inputs", async ({ page }) => {
      await gotoStory(page, STORIES.separator);

      await expect(page.getByText("Verification code")).toBeVisible();
      await expect(page.locator("[data-otp-field]")).toBeVisible();
    });
  });
});
