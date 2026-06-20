import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-button--default",
  primary: "components-button--primary",
  quiet: "components-button--quiet",
  link: "components-button--link",
  warning: "components-button--warning",
  danger: "components-button--danger",
  extraSmall: "components-button--extra-small",
  small: "components-button--small",
  large: "components-button--large",
  iconOnly: "components-button--icon-only",
  pending: "components-button--pending",
  disabled: "components-button--disabled",
  asAnchor: "components-button--as-anchor",
  cssCheck: "components-button--css-check",
} as const;

test.describe("Button", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.default, "button-default.png");
    });

    test("primary", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.primary, "button-primary.png");
    });

    test("quiet", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.quiet, "button-quiet.png");
    });

    test("link", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.link, "button-link.png");
    });

    test("warning", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.warning, "button-warning.png");
    });

    test("danger", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.danger, "button-danger.png");
    });

    test("extra small", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.extraSmall,
        "button-extra-small.png",
      );
    });

    test("small", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.small, "button-small.png");
    });

    test("large", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.large, "button-large.png");
    });

    test("icon only", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.iconOnly,
        "button-icon-only.png",
      );
    });

    test("pending", async ({ page }) => {
      await expectStoryScreenshot(page, STORIES.pending, "button-pending.png");
    });

    test("disabled", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.disabled,
        "button-disabled.png",
      );
    });

    test("as anchor", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.asAnchor,
        "button-as-anchor.png",
      );
    });

    test("css check", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.cssCheck,
        "button-css-check.png",
      );
    });
  });

  test.describe("interactions", () => {
    test("default button is clickable", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const button = page.getByRole("button", { name: "Default" });
      await expect(button).toBeEnabled();
      await button.click();
      await expect(button).toBeVisible();
    });

    test("disabled button cannot be clicked", async ({ page }) => {
      await gotoStory(page, STORIES.disabled);

      await expect(
        page.getByRole("button", { name: "Disabled" }),
      ).toBeDisabled();
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("icon only button has accessible name", async ({ page }) => {
      await gotoStory(page, STORIES.iconOnly);

      await expect(page.getByRole("button", { name: "Upload" })).toBeVisible();
    });

    test("anchor variant renders as link", async ({ page }) => {
      await gotoStory(page, STORIES.asAnchor);

      await expect(
        page.getByRole("link", { name: "Visit site" }),
      ).toBeVisible();
    });
  });
});
