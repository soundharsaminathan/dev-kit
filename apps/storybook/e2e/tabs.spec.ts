import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import {
  getTabsRoot,
  gotoStory,
  VIEWPORT_SCREENSHOT_OPTIONS,
} from "./helpers/storybook";
import { responsiveDescribeOptions } from "./helpers/viewports";

const STORIES = {
  default: "components-tabs--default",
  line: "components-tabs--line",
} as const;

test.describe("Tabs", () => {
  test.describe("visual regression", responsiveDescribeOptions, () => {
    test("default — account selected", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(page.getByRole("tab", { name: "Account" })).toBeVisible();
      await expect(page).toHaveScreenshot("tabs-default-account.png", {
        ...VIEWPORT_SCREENSHOT_OPTIONS,
      });
    });

    test("default — password selected", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await page.getByRole("tab", { name: "Password" }).click();
      await expect(page.getByRole("tab", { name: "Password" })).toHaveAttribute(
        "aria-selected",
        "true",
      );

      await expect(page).toHaveScreenshot("tabs-default-password.png", {
        ...VIEWPORT_SCREENSHOT_OPTIONS,
      });
    });

    test("line variant — account selected", async ({ page }) => {
      await gotoStory(page, STORIES.line);

      await expect(page.getByRole("tab", { name: "Account" })).toBeVisible();
      await expect(page).toHaveScreenshot("tabs-line-account.png", {
        ...VIEWPORT_SCREENSHOT_OPTIONS,
      });
    });
  });

  test.describe("interactions", () => {
    test("selects a tab on click", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const accountTab = page.getByRole("tab", { name: "Account" });
      const passwordTab = page.getByRole("tab", { name: "Password" });

      await expect(accountTab).toHaveAttribute("aria-selected", "true");
      await expect(
        page.getByText("Manage your account settings."),
      ).toBeVisible();

      await passwordTab.click();
      await expect(passwordTab).toHaveAttribute("aria-selected", "true");
      await expect(accountTab).toHaveAttribute("aria-selected", "false");
      await expect(page.getByText("Change your password.")).toBeVisible();
    });

    test("ArrowRight moves selection to the next tab", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const accountTab = page.getByRole("tab", { name: "Account" });
      await accountTab.focus();
      await page.keyboard.press("ArrowRight");

      await expect(page.getByRole("tab", { name: "Password" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    test("ArrowLeft moves selection to the previous tab", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await page.getByRole("tab", { name: "Password" }).click();
      const passwordTab = page.getByRole("tab", { name: "Password" });
      await passwordTab.focus();
      await page.keyboard.press("ArrowLeft");

      await expect(page.getByRole("tab", { name: "Account" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("exposes tablist with selected tab", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(page.getByRole("tablist")).toBeVisible();
      await expect(page.getByRole("tab", { name: "Account" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      await expect(page.getByRole("tab", { name: "Password" })).toHaveAttribute(
        "aria-selected",
        "false",
      );
    });

    test("inactive panel is marked inert", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const passwordPanel = page
        .locator('[data-tab-panel=""]')
        .filter({ hasText: "Change your password." });

      await expect(passwordPanel).toHaveAttribute("data-inert", "true");
    });

    test("line variant is reflected on tabs root and tabs", async ({
      page,
    }) => {
      await gotoStory(page, STORIES.line);

      await expect(page.locator('[data-tab-list=""]')).toHaveAttribute(
        "data-variant",
        "line",
      );
      await expect(page.getByRole("tab", { name: "Account" })).toHaveAttribute(
        "data-variant",
        "line",
      );
    });
  });

  test.describe("layout", responsiveDescribeOptions, () => {
    test("tab panels render below the tab list in horizontal mode", async ({
      page,
    }) => {
      await gotoStory(page, STORIES.default);

      const tablist = page.getByRole("tablist");
      const panel = page.getByText("Manage your account settings.");

      const tablistBox = await tablist.boundingBox();
      const panelBox = await panel.boundingBox();

      expect(tablistBox).not.toBeNull();
      expect(panelBox).not.toBeNull();
      expect(panelBox!.y).toBeGreaterThanOrEqual(
        tablistBox!.y + tablistBox!.height - 8,
      );
    });

    test("tabs root uses horizontal orientation by default", async ({
      page,
    }) => {
      await gotoStory(page, STORIES.default);

      await expect(getTabsRoot(page)).toHaveAttribute(
        "data-orientation",
        "horizontal",
      );
    });
  });
});
