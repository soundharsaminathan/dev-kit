import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";
import { responsiveDescribeOptions } from "./helpers/viewports";

const STORIES = {
  default: "components-breadcrumbs--default",
  manual: "components-breadcrumbs--manual",
  customSeparator: "components-breadcrumbs--custom-separator",
  disabled: "components-breadcrumbs--disabled",
} as const;

test.describe("Breadcrumbs", () => {
  test.describe("visual regression", responsiveDescribeOptions, () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "breadcrumbs-default.png",
      );
    });

    test("manual", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.manual,
        "breadcrumbs-manual.png",
      );
    });

    test("custom separator", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.customSeparator,
        "breadcrumbs-custom-separator.png",
      );
    });

    test("disabled", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.disabled,
        "breadcrumbs-disabled.png",
      );
    });
  });

  test.describe("interactions", () => {
    test("breadcrumb links are visible and navigable", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(page.getByRole("link", { name: "Home" })).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Components" }),
      ).toBeVisible();
      await expect(page.getByText("Breadcrumbs")).toBeVisible();
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("renders breadcrumb navigation structure", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(page.locator("[data-breadcrumbs]")).toBeVisible();
    });
  });
});
