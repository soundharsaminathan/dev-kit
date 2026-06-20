import { expect, test } from "@playwright/test";
import { expectStoryAccessible } from "./helpers/a11y";
import {
  getDisclosure,
  getDisclosurePanel,
  gotoStory,
} from "./helpers/storybook";
import { responsiveDescribeOptions } from "./helpers/viewports";

const STORIES = {
  default: "components-accordion--default",
  allowsMultiple: "components-accordion--allows-multiple",
  defaultExpanded: "components-accordion--default-expanded",
} as const;

const FIRST_QUESTION = "How do I get started?";
const SECOND_QUESTION = "Can I customize the components?";
const THIRD_QUESTION = "Is TypeScript supported?";

test.describe("Accordion", () => {
  test.describe("visual regression", responsiveDescribeOptions, () => {
    test("default — collapsed", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await expect(
        page.getByRole("button", { name: FIRST_QUESTION }),
      ).toBeVisible();
      await expect(page).toHaveScreenshot("accordion-default-collapsed.png", {
        fullPage: true,
      });
    });

    test("default — first item expanded", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      await page.getByRole("button", { name: FIRST_QUESTION }).click();
      await expect(getDisclosure(page, 0)).toHaveAttribute(
        "data-expanded",
        "true",
      );

      await expect(page).toHaveScreenshot(
        "accordion-default-first-expanded.png",
        {
          fullPage: true,
        },
      );
    });

    test("allows multiple — one expanded by default", async ({ page }) => {
      await gotoStory(page, STORIES.allowsMultiple);

      await expect(getDisclosure(page, 0)).toHaveAttribute(
        "data-expanded",
        "true",
      );

      await expect(page).toHaveScreenshot(
        "accordion-allows-multiple-one-expanded.png",
        {
          fullPage: true,
        },
      );
    });

    test("default expanded — second item open", async ({ page }) => {
      await gotoStory(page, STORIES.defaultExpanded);

      await expect(getDisclosure(page, 1)).toHaveAttribute(
        "data-expanded",
        "true",
      );

      await expect(page).toHaveScreenshot(
        "accordion-default-expanded-second.png",
        {
          fullPage: true,
        },
      );
    });
  });

  test.describe("interactions", () => {
    test("expands and collapses a section on click", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const trigger = page.getByRole("button", { name: FIRST_QUESTION });
      const panel = getDisclosurePanel(page, 0);

      await expect(panel).toBeHidden();

      await trigger.click();
      await expect(panel).toBeVisible();
      await expect(getDisclosure(page, 0)).toHaveAttribute(
        "data-expanded",
        "true",
      );

      await trigger.click();
      await expect(panel).toBeHidden();
    });

    test("collapses the previously expanded section in single mode", async ({
      page,
    }) => {
      await gotoStory(page, STORIES.default);

      await page.getByRole("button", { name: FIRST_QUESTION }).click();
      await expect(getDisclosurePanel(page, 0)).toBeVisible();

      await page.getByRole("button", { name: SECOND_QUESTION }).click();
      await expect(getDisclosurePanel(page, 0)).toBeHidden();
      await expect(getDisclosurePanel(page, 1)).toBeVisible();
    });

    test("allows multiple sections open when configured", async ({ page }) => {
      await gotoStory(page, STORIES.allowsMultiple);

      await page.getByRole("button", { name: SECOND_QUESTION }).click();

      await expect(getDisclosurePanel(page, 0)).toBeVisible();
      await expect(getDisclosurePanel(page, 1)).toBeVisible();
    });
  });

  test.describe("accessibility", () => {
    test("default story has no accessibility violations", async ({ page }) => {
      await expectStoryAccessible(page, STORIES.default);
    });

    test("expanded section has no accessibility violations", async ({
      page,
    }) => {
      await expectStoryAccessible(page, STORIES.default, {
        beforeScan: async (storyPage) => {
          await storyPage.getByRole("button", { name: FIRST_QUESTION }).click();
        },
      });
    });

    test("trigger reflects expanded state", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const trigger = page.getByRole("button", { name: FIRST_QUESTION });
      await expect(trigger).toHaveAttribute("aria-expanded", "false");

      await trigger.click();
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
    });

    test("expanded panel content is exposed", async ({ page }) => {
      await gotoStory(page, STORIES.defaultExpanded);

      await expect(
        page.getByText(
          "Yes. Components use design tokens and SCSS modules so you can match your design system.",
        ),
      ).toBeVisible();
    });
  });

  test.describe("layout", responsiveDescribeOptions, () => {
    test("expanded panel appears below its trigger", async ({ page }) => {
      await gotoStory(page, STORIES.default);

      const trigger = page.getByRole("button", { name: FIRST_QUESTION });
      await trigger.click();

      const panel = getDisclosurePanel(page, 0);
      const triggerBox = await trigger.boundingBox();
      const panelBox = await panel.boundingBox();

      expect(triggerBox).not.toBeNull();
      expect(panelBox).not.toBeNull();
      expect(panelBox!.y).toBeGreaterThanOrEqual(
        triggerBox!.y + triggerBox!.height - 8,
      );
    });

    test("all accordion sections remain in document order", async ({
      page,
    }) => {
      await gotoStory(page, STORIES.default);

      const triggers = [
        page.getByRole("button", { name: FIRST_QUESTION }),
        page.getByRole("button", { name: SECOND_QUESTION }),
        page.getByRole("button", { name: THIRD_QUESTION }),
      ];

      const positions = await Promise.all(
        triggers.map(async (trigger) => {
          const box = await trigger.boundingBox();
          return box?.y ?? 0;
        }),
      );

      expect(positions[0]).toBeLessThan(positions[1]!);
      expect(positions[1]).toBeLessThan(positions[2]!);
    });
  });
});
