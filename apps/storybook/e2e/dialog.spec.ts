import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import {
  clickBackdrop,
  expectPanelMostlyCentered,
  getModalPanel,
  gotoStory,
  isFocusWithin,
  VIEWPORT_SCREENSHOT_OPTIONS,
  waitForModalReady,
} from "./helpers/storybook";
import { responsiveDescribeOptions } from "./helpers/viewports";

const STORIES = {
  default: "components-dialog--default",
  controlled: "components-dialog--controlled",
} as const;

test.describe("Dialog", () => {
  test.describe("visual regression", responsiveDescribeOptions, () => {
    test("default — closed", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(
        page.getByRole("button", { name: "Open dialog" }),
      ).toBeVisible();
      await expect(page).toHaveScreenshot("dialog-default-closed.png", {
        ...VIEWPORT_SCREENSHOT_OPTIONS,
      });
    });

    test("default — open", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await page.getByRole("button", { name: "Open dialog" }).click();
      await waitForModalReady(page);

      await expect(page).toHaveScreenshot("dialog-default-open.png", {
        ...VIEWPORT_SCREENSHOT_OPTIONS,
      });
    });

    test("controlled — open", async ({ page }) => {
      await gotoStory(page, STORIES.controlled);
      await waitForModalReady(page);

      await expect(page).toHaveScreenshot("dialog-controlled-open.png", {
        ...VIEWPORT_SCREENSHOT_OPTIONS,
      });
    });
  });

  test.describe("interactions", () => {
    test("opens on trigger click and closes on Escape", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const trigger = page.getByRole("button", { name: "Open dialog" });
      await trigger.click();
      await waitForModalReady(page);

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Edit profile" }),
      ).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeVisible();
    });

    test("closes when backdrop is clicked", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await page.getByRole("button", { name: "Open dialog" }).click();
      await waitForModalReady(page);

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      await clickBackdrop(page);
      await expect(dialog).toBeHidden();
    });

    test("closes via header Close button", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await page.getByRole("button", { name: "Open dialog" }).click();
      await waitForModalReady(page);

      await page.getByRole("button", { name: "Close" }).click();
      await expect(page.getByRole("dialog")).toBeHidden();
    });

    test("moves focus into the dialog when opened", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await page.getByRole("button", { name: "Open dialog" }).click();
      await waitForModalReady(page);

      const dialog = page.getByRole("dialog");
      await expect.poll(() => isFocusWithin(page, dialog)).toBe(true);
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("open dialog has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default, {
        beforeScan: async (storyPage) => {
          await storyPage.getByRole("button", { name: "Open dialog" }).click();
          await waitForModalReady(storyPage);
        },
        scopeToStory: false,
      });
    });

    test("exposes dialog semantics with title and description", async ({
      page,
    }) => {
      await gotoStory(page, STORIES.default);

      await page.getByRole("button", { name: "Open dialog" }).click();
      await waitForModalReady(page);

      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Edit profile" }),
      ).toBeVisible();
      await expect(
        page.getByText(
          "Make changes to your profile here. Click save when you are done.",
        ),
      ).toBeVisible();
    });
  });

  test.describe("layout", responsiveDescribeOptions, () => {
    test("dialog panel is centered in the viewport", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await page.getByRole("button", { name: "Open dialog" }).click();
      await waitForModalReady(page);

      await expectPanelMostlyCentered(getModalPanel(page), page);
    });
  });
});
