import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import {
  expectOverlayAlignedWithTrigger,
  expectOverlayBelowTrigger,
  getComboboxInput,
  getInputGroup,
  getPopover,
  gotoStory,
  openCombobox,
  VIEWPORT_SCREENSHOT_OPTIONS,
} from "./helpers/storybook";
import { responsiveDescribeOptions } from "./helpers/viewports";

const STORIES = {
  default: "components-combobox--default",
} as const;

test.describe("Combobox", () => {
  test.describe("visual regression", responsiveDescribeOptions, () => {
    test("default — closed", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(getComboboxInput(page)).toBeVisible();
      await expect(page).toHaveScreenshot("combobox-default-closed.png", {
        ...VIEWPORT_SCREENSHOT_OPTIONS,
      });
    });

    test("default — open", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await openCombobox(page);

      await expect(page).toHaveScreenshot("combobox-default-open.png", {
        ...VIEWPORT_SCREENSHOT_OPTIONS,
      });
    });
  });

  test.describe("interactions", () => {
    test("opens on focus and closes on Escape", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const input = await openCombobox(page);

      const listbox = page.getByRole("listbox");
      await expect(listbox).toBeVisible();
      await expect(
        page.getByRole("option", { name: "United States" }),
      ).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(listbox).toBeHidden();
      await expect(input).toBeVisible();
    });

    test("selects an option with keyboard", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await openCombobox(page);

      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");

      await expect(page.getByRole("listbox")).toBeHidden();
      await expect(getComboboxInput(page)).toHaveValue("United States");
    });

    test("ArrowDown moves focus through options", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const input = await openCombobox(page);
      await input.press("ArrowDown");
      await expect(
        page.getByRole("option", { name: "United States" }),
      ).toHaveAttribute("data-focused", "true");
      await expect(input).toBeFocused();

      await input.press("ArrowDown");
      await expect(
        page.getByRole("option", { name: "Canada" }),
      ).toHaveAttribute("data-focused", "true");
    });

    test("selects an option with click", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await openCombobox(page);
      await page.getByRole("option", { name: "Canada" }).click();

      await expect(page.getByRole("listbox")).toBeHidden();
      await expect(getComboboxInput(page)).toHaveValue("Canada");
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("open listbox has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default, {
        beforeScan: openCombobox,
        scopeToStory: false,
      });
    });

    test("exposes combobox role with placeholder", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const input = getComboboxInput(page);
      await expect(input).toBeVisible();
      await expect(input).toHaveAttribute("placeholder", "Select a country...");
    });

    test("toggle button is labelled for assistive technology", async ({
      page,
    }) => {
      await gotoStory(page, STORIES.default);

      await expect(
        page.getByRole("button", { name: "Show suggestions" }),
      ).toBeVisible();
    });
  });

  test.describe("layout", responsiveDescribeOptions, () => {
    test("listbox opens aligned below the input group", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await openCombobox(page);

      const trigger = getInputGroup(page);
      const popover = getPopover(page);

      await expectOverlayBelowTrigger(trigger, popover);
      await expectOverlayAlignedWithTrigger(trigger, popover);
    });

    test("open listbox stays within the viewport", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await openCombobox(page);

      const listbox = getPopover(page);
      const box = await listbox.boundingBox();
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
