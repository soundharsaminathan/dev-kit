import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import {
  expectOverlayBelowTrigger,
  getPopover,
  getSelectTrigger,
  gotoStory,
} from "./helpers/storybook";
import { responsiveDescribeOptions } from "./helpers/viewports";

const STORIES = {
  default: "components-select--default",
} as const;

test.describe("Select", () => {
  test.describe("visual regression", responsiveDescribeOptions, () => {
    test("default — closed", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(
        page.getByRole("button", { name: "Provider" }),
      ).toBeVisible();
      await expect(page).toHaveScreenshot("select-default-closed.png", {
        fullPage: true,
      });
    });

    test("default — open", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const trigger = getSelectTrigger(page);
      await trigger.click();
      await page.getByRole("listbox").waitFor({ state: "visible" });

      await expect(page).toHaveScreenshot("select-default-open.png", {
        fullPage: true,
      });
    });
  });

  test.describe("interactions", () => {
    test("opens on trigger click and closes on Escape", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const trigger = page.getByRole("button", { name: "Provider" });
      await trigger.click();

      const listbox = page.getByRole("listbox");
      await expect(listbox).toBeVisible();
      await expect(
        page.getByRole("option", { name: "Perplexity" }),
      ).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(listbox).toBeHidden();
      await expect(trigger).toBeVisible();
    });

    test("selects an option with keyboard", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const trigger = getSelectTrigger(page);
      await trigger.click();
      await page.getByRole("listbox").waitFor({ state: "visible" });

      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");

      await expect(page.getByRole("listbox")).toBeHidden();
      await expect(trigger).toContainText("Perplexity");
    });

    test("ArrowDown moves focus through options", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const trigger = getSelectTrigger(page);
      await trigger.click();
      await page.getByRole("listbox").waitFor({ state: "visible" });

      await page.keyboard.press("ArrowDown");
      await expect(
        page.getByRole("option", { name: "Perplexity" }),
      ).toBeFocused();

      await page.keyboard.press("ArrowDown");
      await expect(
        page.getByRole("option", { name: "Replicate" }),
      ).toBeFocused();
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("open listbox has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default, {
        beforeScan: async (storyPage) => {
          await storyPage.getByRole("button", { name: "Provider" }).click();
          await storyPage.getByRole("listbox").waitFor({ state: "visible" });
        },
        scopeToStory: false,
      });
    });

    test("trigger reflects expanded state", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const trigger = page.getByRole("button", { name: "Provider" });
      await expect(trigger).toHaveAttribute("aria-expanded", "false");

      await trigger.click();
      await page.getByRole("listbox").waitFor({ state: "visible" });
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
    });

    test("shows placeholder when no value is selected", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(page.locator('[data-slot="select-value"]')).toHaveAttribute(
        "data-placeholder",
        "true",
      );
      await expect(
        page.getByRole("button", { name: "Provider" }),
      ).toContainText("Select a provider");
    });
  });

  test.describe("layout", responsiveDescribeOptions, () => {
    test("listbox opens below the trigger", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const trigger = page.getByRole("button", { name: "Provider" });
      await trigger.click();
      await page.getByRole("listbox").waitFor({ state: "visible" });

      await expectOverlayBelowTrigger(trigger, getPopover(page));
    });
  });
});
