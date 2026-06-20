import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import { expectStoryScreenshot, gotoStory } from "./helpers/storybook";

const STORIES = {
  default: "components-numberfield--default",
  withLabel: "components-numberfield--with-label",
  disabled: "components-numberfield--disabled",
} as const;

test.describe("NumberField", () => {
  test.describe("visual regression", () => {
    test("default", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.default,
        "number-field-default.png",
      );
    });

    test("with label", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.withLabel,
        "number-field-with-label.png",
      );
    });

    test("disabled", async ({ page }) => {
      await expectStoryScreenshot(
        page,
        STORIES.disabled,
        "number-field-disabled.png",
      );
    });
  });

  test.describe("interactions", () => {
    test("increases value with stepper button", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const input = page.getByRole("textbox", { name: "Quantity" });
      await expect(input).toHaveValue("5");

      await page.getByRole("button", { name: "Increase Quantity" }).click();
      await expect(input).toHaveValue("6");
    });

    test("decreases value with stepper button", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const input = page.getByRole("textbox", { name: "Quantity" });
      await page.getByRole("button", { name: "Decrease Quantity" }).click();
      await expect(input).toHaveValue("4");
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("stepper buttons are labelled", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(
        page.getByRole("button", { name: "Increase Quantity" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Decrease Quantity" }),
      ).toBeVisible();
    });
  });
});
