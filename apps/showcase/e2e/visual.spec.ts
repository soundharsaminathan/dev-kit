import { test } from "@playwright/test";
import { generateVisualTestCases } from "../src/lib/visual-test-matrix";
import { defaultControlValues } from "../src/modules/showcase/types";
import { getRegistryEntry } from "../src/registry";
import {
  applyControlValues,
  waitForControlsPanel,
} from "./helpers/apply-controls";
import {
  expectPageScreenshot,
  VIEWPORT_SCREENSHOT_OPTIONS,
  waitForComponentCardPreviews,
  waitForThemesPage,
} from "./helpers/screenshots";
import { runVisualInteraction } from "./helpers/visual-interactions";

const visualCases = generateVisualTestCases();

test.describe("Visual regression", () => {
  test.describe("pages", () => {
    test("home", async ({ page }) => {
      await expectPageScreenshot(page, "/", "home.png", { fullPage: true });
    });

    test("components index", async ({ page }) => {
      await expectPageScreenshot(page, "/components", "components-index.png", {
        fullPage: true,
        beforeScreenshot: waitForComponentCardPreviews,
      });
    });

    test("themes", async ({ page }) => {
      await expectPageScreenshot(page, "/themes", "themes.png", {
        fullPage: true,
        locator: page.locator("main"),
        beforeScreenshot: waitForThemesPage,
      });
    });

    test("not found", async ({ page }) => {
      await expectPageScreenshot(
        page,
        "/components/not-a-real-component",
        "not-found.png",
        { fullPage: true },
      );
    });
  });

  test.describe("playgrounds", () => {
    for (const visualCase of visualCases) {
      test(`${visualCase.caseId}`, async ({ page }) => {
        const entry = getRegistryEntry(visualCase.slug);
        if (!entry) {
          throw new Error(`Missing registry entry for ${visualCase.slug}`);
        }

        const defaults = defaultControlValues(entry.config.controls);

        await expectPageScreenshot(
          page,
          `/components/${visualCase.slug}`,
          visualCase.screenshotName,
          {
            ...VIEWPORT_SCREENSHOT_OPTIONS,
            beforeScreenshot: async (demoPage) => {
              await waitForControlsPanel(demoPage);
              await applyControlValues(
                demoPage,
                entry.config.controls,
                visualCase.values,
                defaults,
              );
              if (visualCase.interaction) {
                await runVisualInteraction(demoPage, visualCase.interaction);
              }
            },
          },
        );
      });
    }
  });
});
