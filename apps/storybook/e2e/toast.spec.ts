import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";
import { responsiveDescribeOptions } from "./helpers/viewports";

const STORIES = {
  default: "components-toast--default",
  success: "components-toast--success",
  errorToast: "components-toast--error-toast",
  withAction: "components-toast--with-action",
  loading: "components-toast--loading",
  topCenter: "components-toast--top-center",
} as const;

async function openToast(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Show toast" }).click();
  await page.locator("[data-toast]").waitFor({ state: "visible" });
}

test.describe("Toast", () => {
  test.describe("visual regression", responsiveDescribeOptions, () => {
    test("default — closed", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "toast-default-closed.png",
      );
    });

    test("default — open", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "toast-default-open.png",
        openToast,
      );
    });

    test("success — open", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.success,
        "toast-success-open.png",
        openToast,
      );
    });

    test("error — open", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.errorToast,
        "toast-error-open.png",
        openToast,
      );
    });

    test("with action — open", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.withAction,
        "toast-with-action-open.png",
        openToast,
      );
    });

    test("loading — open", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.loading,
        "toast-loading-open.png",
        openToast,
      );
    });

    test("top center — open", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.topCenter,
        "toast-top-center-open.png",
        openToast,
      );
    });
  });

  test.describe("interactions", () => {
    test("opens on trigger click and closes on close button", async ({
      page,
    }) => {
      await gotoStory(page, STORIES.default);

      await openToast(page);
      await expect(page.locator("[data-toast-title]")).toHaveText(
        "Files uploaded",
      );

      await page.getByRole("button", { name: "Close" }).click();
      await expect(page.locator("[data-toast]")).toBeHidden();
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("open toast has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default, {
        beforeScan: openToast,
        scopeToStory: false,
      });
    });

    test("toast exposes title and description", async ({ page }) => {
      await gotoStory(page, STORIES.default);
      await openToast(page);

      await expect(page.locator("[data-toast-title]")).toHaveText(
        "Files uploaded",
      );
      await expect(page.locator("[data-toast-description]")).toHaveText(
        "3 files uploaded successfully.",
      );
    });
  });
});
