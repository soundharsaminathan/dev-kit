import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import {
  expectStoryScreenshot,
  focusFirstDateSegment,
  gotoStory,
} from "./helpers/storybook";

const STORIES = {
  default: "components-datepicker--default",
  withLabelProp: "components-datepicker--with-label-prop",
  withDescription: "components-datepicker--with-description",
  invalid: "components-datepicker--invalid",
  disabled: "components-datepicker--disabled",
  range: "components-datepicker--range",
} as const;

test.describe("DatePicker", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "date-picker-default.png",
      );
    });

    test("with label prop", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.withLabelProp,
        "date-picker-with-label-prop.png",
      );
    });

    test("with description", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.withDescription,
        "date-picker-with-description.png",
      );
    });

    test("invalid", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.invalid,
        "date-picker-invalid.png",
      );
    });

    test("disabled", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.disabled,
        "date-picker-disabled.png",
      );
    });

    test("range", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.range, "date-picker-range.png");
    });

    test("focused segment", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "date-picker-focused-segment.png",
        focusFirstDateSegment,
      );
    });
  });

  test.describe("interactions", () => {
    test("opens calendar popover when button is clicked", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await page.locator("[data-date-picker-button]").click();
      await expect(page.locator("[data-calendar]")).toBeVisible();
    });

    test("disabled picker cannot open popover", async ({ page }) => {
      await gotoStory(page, STORIES.disabled);

      await expect(page.locator("[data-date-picker-button]")).toBeDisabled();
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("open popover has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default, {
        beforeScan: async (scanPage) => {
          await scanPage.locator("[data-date-picker-button]").click();
          await expect(scanPage.locator("[data-calendar]")).toBeVisible();
        },
      });
    });

    test("focused segment has no accessibility violations", async ({
      page,
    }) => {
      await expectStoryAccessible(page, STORIES.default, {
        beforeScan: focusFirstDateSegment,
      });
    });
  });
});
