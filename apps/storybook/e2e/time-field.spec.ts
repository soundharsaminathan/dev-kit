import { test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import {
  expectStoryScreenshot,
  focusFirstDateSegment,
  gotoStory,
} from "./helpers/storybook";

const STORIES = {
  default: "components-timefield--default",
  withLabelProp: "components-timefield--with-label-prop",
  withDescription: "components-timefield--with-description",
  invalid: "components-timefield--invalid",
  disabled: "components-timefield--disabled",
} as const;

test.describe("TimeField", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "time-field-default.png",
      );
    });

    test("with label prop", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.withLabelProp,
        "time-field-with-label-prop.png",
      );
    });

    test("with description", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.withDescription,
        "time-field-with-description.png",
      );
    });

    test("invalid", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.invalid,
        "time-field-invalid.png",
      );
    });

    test("disabled", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.disabled,
        "time-field-disabled.png",
      );
    });

    test("focused segment", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "time-field-focused-segment.png",
        focusFirstDateSegment,
      );
    });
  });

  test.describe("interactions", () => {
    test("time field segments are focusable", async ({ page }) => {
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
