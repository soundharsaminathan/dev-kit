import { expect, type Page, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import {
  expectOverlayBelowTrigger,
  getMenuContent,
  gotoStory,
  waitForMenuReady,
} from "./helpers/storybook";
import { responsiveDescribeOptions } from "./helpers/viewports";

const STORIES = {
  default: "components-menu--default",
} as const;

async function focusFirstMenuItem(page: Page) {
  const trigger = page.getByRole("button", { name: "Open menu" });
  await trigger.click();
  await waitForMenuReady(page);
  await page.getByRole("menu").focus();
  await page.keyboard.press("ArrowDown");
  return trigger;
}

test.describe("Menu", () => {
  test.describe("visual regression", responsiveDescribeOptions, () => {
    test("default — closed", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(
        page.getByRole("button", { name: "Open menu" }),
      ).toBeVisible();
      await expect(page).toHaveScreenshot("menu-default-closed.png", {
        fullPage: true,
      });
    });

    test("default — open", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await page.getByRole("button", { name: "Open menu" }).click();
      await waitForMenuReady(page);

      await expect(page).toHaveScreenshot("menu-default-open.png", {
        fullPage: true,
      });
    });
  });

  test.describe("interactions", () => {
    test("opens on trigger click and closes on Escape", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const trigger = page.getByRole("button", { name: "Open menu" });
      await trigger.click();
      await waitForMenuReady(page);

      const menu = page.getByRole("menu");
      await expect(menu).toBeVisible();
      await expect(page.getByRole("menuitem", { name: "Edit" })).toBeVisible();

      await menu.focus();
      await page.keyboard.press("Escape");
      await expect(menu).toBeHidden();
      await expect(trigger).toBeVisible();
    });

    test("selects an item with Enter and closes", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await focusFirstMenuItem(page);
      await expect(page.getByRole("menuitem", { name: "Edit" })).toBeFocused();

      await page.keyboard.press("Enter");
      await expect(page.getByRole("menu")).toBeHidden();
    });

    test("ArrowDown moves focus through items", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await focusFirstMenuItem(page);
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
        beforeScan: async (storyPage) => {
          await storyPage.getByRole("button", { name: "Open menu" }).click();
          await waitForMenuReady(storyPage);
        },
        scopeToStory: false,
      });
    });

    test("trigger reflects expanded state", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const trigger = page.getByRole("button", { name: "Open menu" });
      await expect(trigger).toHaveAttribute("aria-expanded", "false");

      await trigger.click();
      await waitForMenuReady(page);
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
    });

    test("danger item is exposed in the menu", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await page.getByRole("button", { name: "Open menu" }).click();
      await waitForMenuReady(page);

      const deleteItem = page.getByRole("menuitem", { name: "Delete" });
      await expect(deleteItem).toBeVisible();
      await expect(deleteItem).toHaveAttribute("data-variant", "danger");
    });
  });

  test.describe("layout", responsiveDescribeOptions, () => {
    test("menu opens below the trigger", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const trigger = page.getByRole("button", { name: "Open menu" });
      await trigger.click();
      await waitForMenuReady(page);

      await expectOverlayBelowTrigger(trigger, getMenuContent(page));
    });

    test("open menu stays within the viewport", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await page.getByRole("button", { name: "Open menu" }).click();
      await waitForMenuReady(page);

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
