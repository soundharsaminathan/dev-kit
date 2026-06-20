import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  accent: "components-link--accent",
  quiet: "components-link--quiet",
  unstyled: "components-link--unstyled",
  disabled: "components-link--disabled",
} as const;

test.describe("Link", () => {
  test.describe("visual regression", () => {
    test("accent", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.accent, "link-accent.png");
    });

    test("quiet", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.quiet, "link-quiet.png");
    });

    test("unstyled", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.unstyled, "link-unstyled.png");
    });

    test("disabled", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.disabled, "link-disabled.png");
    });
  });

  test.describe("interactions", () => {
    test("accent link is focusable", async ({ page }) => {
      await gotoStory(page, STORIES.accent);

      const link = page.getByRole("link", { name: "Learn more" });
      await link.focus();
      await expect(link).toBeFocused();
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.accent);
    });

    test("disabled link is marked", async ({ page }) => {
      await gotoStory(page, STORIES.disabled);

      const link = page.getByRole("link", { name: "Unavailable" });
      await expect(link).toHaveAttribute("aria-disabled", "true");
    });
  });
});
