import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import {
  getContextMenuTrigger,
  getMenuContent,
  gotoStory,
  openContextMenu,
} from "./helpers/storybook";
import { responsiveDescribeOptions } from "./helpers/viewports";

const STORIES = {
  default: "components-contextmenu--default",
  withButtonTrigger: "components-contextmenu--with-button-trigger",
} as const;

test.describe("ContextMenu", () => {
  test.describe("visual regression", responsiveDescribeOptions, () => {
    test("default — closed", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(page.getByText("Right click me")).toBeVisible();
      await expect(page).toHaveScreenshot("context-menu-default-closed.png", {
        fullPage: true,
      });
    });

    test("default — open", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await openContextMenu(page);

      await expect(page).toHaveScreenshot("context-menu-default-open.png", {
        fullPage: true,
      });
    });

    test("with button trigger — open", async ({ page }) => {
      await gotoStory(page, STORIES.withButtonTrigger);

      await openContextMenu(page);

      await expect(page).toHaveScreenshot(
        "context-menu-button-trigger-open.png",
        {
          fullPage: true,
        },
      );
    });
  });

  test.describe("interactions", () => {
    test("opens on right click and closes on Escape", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await openContextMenu(page);

      const menu = page.getByRole("menu");
      await expect(menu).toBeVisible();
      await expect(page.getByRole("menuitem", { name: "Edit" })).toBeVisible();

      await menu.focus();
      await page.keyboard.press("Escape");
      await expect(menu).toBeHidden();
      await expect(getContextMenuTrigger(page)).toBeVisible();
    });

    test("selects an item with Enter and closes", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await openContextMenu(page);

      await page.getByRole("menu").focus();
      await page.keyboard.press("ArrowDown");
      await expect(page.getByRole("menuitem", { name: "Edit" })).toBeFocused();

      await page.keyboard.press("Enter");
      await expect(page.getByRole("menu")).toBeHidden();
    });

    test("ArrowDown moves focus through items", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await openContextMenu(page);

      await page.getByRole("menu").focus();
      await page.keyboard.press("ArrowDown");
      await expect(page.getByRole("menuitem", { name: "Edit" })).toBeFocused();

      await page.keyboard.press("ArrowDown");
      await expect(
        page.getByRole("menuitem", { name: "Duplicate" }),
      ).toBeFocused();
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("open menu has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default, {
        beforeScan: openContextMenu,
        scopeToStory: false,
      });
    });

    test("exposes menu items including danger variant", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await openContextMenu(page);

      const deleteItem = page.getByRole("menuitem", { name: "Delete" });
      await expect(deleteItem).toBeVisible();
      await expect(deleteItem).toHaveAttribute("data-variant", "danger");
    });

    test("trigger is exposed in the accessibility tree", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(getContextMenuTrigger(page)).toBeVisible();
      await expect(page.getByText("Right click me")).toBeVisible();
    });
  });

  test.describe("layout", responsiveDescribeOptions, () => {
    test("open menu stays within the viewport", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await openContextMenu(page);

      const menu = getMenuContent(page);
      const box = await menu.boundingBox();
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
