import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-calendar--default",
  withSelectedDate: "components-calendar--with-selected-date",
  disabled: "components-calendar--disabled",
} as const;

test.describe("Calendar", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "calendar-default.png",
      );
    });

    test("with selected date", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.withSelectedDate,
        "calendar-with-selected-date.png",
      );
    });

    test("disabled", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.disabled,
        "calendar-disabled.png",
      );
    });
  });

  test.describe("interactions", () => {
    test("selects a date cell", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const cells = page.locator(
        "[data-calendar-cell]:not([data-disabled='true']):not([data-outside-month='true'])",
      );
      await expect(cells.first()).toBeVisible();
      await cells.first().click();
      await expect(cells.first()).toHaveAttribute("data-selected", "true");
    });

    test("navigates to next month", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const heading = page.locator("[data-calendar-heading]");
      const initialHeading = await heading.textContent();
      await page.getByRole("button", { name: "Next" }).click();
      await expect(heading).not.toHaveText(initialHeading ?? "");
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });
  });
});
