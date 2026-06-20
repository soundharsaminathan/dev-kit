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
  default: "components-modal--default",
  noCloseButton: "components-modal--no-close-button",
} as const;

test.describe("Modal", () => {
  test.describe("visual regression", responsiveDescribeOptions, () => {
    test("default — open", async ({ page }) => {
      await gotoStory(page, STORIES.default);
      await waitForModalReady(page);

      await expect(page).toHaveScreenshot("modal-default-open.png", {
        ...VIEWPORT_SCREENSHOT_OPTIONS,
      });
    });

    test("default — closed", async ({ page }) => {
      await gotoStory(page, STORIES.default);
      await waitForModalReady(page);
      await page.keyboard.press("Escape");
      await expect(getModalPanel(page)).toBeHidden();

      await expect(page).toHaveScreenshot("modal-default-closed.png", {
        ...VIEWPORT_SCREENSHOT_OPTIONS,
      });
    });

    test("no close button — open", async ({ page }) => {
      await gotoStory(page, STORIES.noCloseButton);
      await waitForModalReady(page);

      await expect(page).toHaveScreenshot("modal-no-close-button-open.png", {
        ...VIEWPORT_SCREENSHOT_OPTIONS,
      });
    });
  });

  test.describe("interactions", () => {
    test("closes on Escape", async ({ page }) => {
      await gotoStory(page, STORIES.default);
      await waitForModalReady(page);

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(
        page.getByRole("button", { name: "Open modal" }),
      ).toBeVisible();
    });

    test("closes when backdrop is clicked", async ({ page }) => {
      await gotoStory(page, STORIES.default);
      await waitForModalReady(page);

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      await clickBackdrop(page);
      await expect(dialog).toBeHidden();
    });

    test("closes via header Close button", async ({ page }) => {
      await gotoStory(page, STORIES.default);
      await waitForModalReady(page);

      await page.getByRole("button", { name: "Close" }).click();
      await expect(page.getByRole("dialog")).toBeHidden();
    });

    test("reopens from trigger after closing", async ({ page }) => {
      await gotoStory(page, STORIES.default);
      await waitForModalReady(page);
      await page.keyboard.press("Escape");
      await expect(getModalPanel(page)).toBeHidden();

      await page.getByRole("button", { name: "Open modal" }).click();
      await waitForModalReady(page);
      await expect(page.getByRole("dialog")).toBeVisible();
    });

    test("moves focus into the modal when opened", async ({ page }) => {
      await gotoStory(page, STORIES.default);
      await waitForModalReady(page);
      await page.keyboard.press("Escape");
      await expect(getModalPanel(page)).toBeHidden();

      await page.getByRole("button", { name: "Open modal" }).click();
      await waitForModalReady(page);

      const dialog = page.getByRole("dialog");
      await expect.poll(() => isFocusWithin(page, dialog)).toBe(true);
    });
  });

  test.describe("accessibility", () => {
    test("open story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default, {
        beforeScan: waitForModalReady,
        scopeToStory: false,
      });
    });

    test("exposes dialog semantics and labelled title", async ({ page }) => {
      await gotoStory(page, STORIES.default);
      await waitForModalReady(page);

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Modal panel" }),
      ).toBeVisible();
      await expect(
        page.getByText(
          "Modal provides the backdrop, viewport, and panel shell.",
        ),
      ).toBeVisible();
    });
  });

  test.describe("layout", responsiveDescribeOptions, () => {
    test("modal panel is centered in the viewport", async ({ page }) => {
      await gotoStory(page, STORIES.default);
      await waitForModalReady(page);

      await expectPanelMostlyCentered(getModalPanel(page), page);
    });

    test("modal panel stays mostly within the viewport", async ({ page }) => {
      await gotoStory(page, STORIES.default);
      await waitForModalReady(page);

      const panel = getModalPanel(page);
      const box = await panel.boundingBox();
      const viewport = page.viewportSize();
      expect(box).not.toBeNull();
      expect(viewport).not.toBeNull();

      const tolerance = 48;
      expect(box!.x).toBeGreaterThanOrEqual(-tolerance);
      expect(box!.y).toBeGreaterThanOrEqual(-tolerance);
      expect(box!.x + box!.width).toBeLessThanOrEqual(
        viewport!.width + tolerance,
      );
      expect(box!.y + box!.height).toBeLessThanOrEqual(
        viewport!.height + tolerance,
      );
    });
  });
});
