import { test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import {
  expectStoryScreenshot,
  focusFirstDateSegment,
  gotoStory,
} from "./helpers/storybook";

const STORIES = {
  default: "components-datefield--default",
  withLabelProp: "components-datefield--with-label-prop",
  withDescription: "components-datefield--with-description",
  invalid: "components-datefield--invalid",
  disabled: "components-datefield--disabled",
} as const;

test.describe("DateField", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "date-field-default.png",
      );
    });

    test("with label prop", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.withLabelProp,
        "date-field-with-label-prop.png",
      );
    });

    test("with description", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.withDescription,
        "date-field-with-description.png",
      );
    });

    test("invalid", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.invalid,
        "date-field-invalid.png",
      );
    });

    test("disabled", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.disabled,
        "date-field-disabled.png",
      );
    });

    test("focused segment", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "date-field-focused-segment.png",
        focusFirstDateSegment,
      );
    });
  });

  test.describe("interactions", () => {
    test("date field segments are focusable", async ({ page }) => {
      await gotoStory(page, STORIES.default);
      await focusFirstDateSegment(page);
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
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
