import { test } from "@playwright/test";
import {
  expectNoA11yViolations,
  expectNoAriaViolations,
  expectNoColorContrastViolations,
  expectPageAccessible,
} from "./helpers/a11y";

const KEY_PAGES = [
  { path: "/", name: "home" },
  { path: "/components", name: "components index" },
  { path: "/components/button", name: "button detail" },
  { path: "/components/disclosure", name: "disclosure detail" },
  { path: "/themes", name: "themes" },
] as const;

const SMOKE_SLUGS = [
  "button",
  "badge",
  "card",
  "checkbox",
  "dialog",
  "input",
  "color-slider",
  "select",
  "switch",
] as const;

test.describe("Accessibility", () => {
  for (const { path, name } of KEY_PAGES) {
    test(`${name} has no WCAG violations`, async ({ page }) => {
      await expectPageAccessible(page, path);
    });

    test(`${name} has no color contrast violations`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expectNoColorContrastViolations(page);
    });

    test(`${name} has no ARIA violations`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expectNoAriaViolations(page);
    });
  }

  test("component detail playground has no violations after control interaction", async ({
    page,
  }) => {
    await page.goto("/components/button");
    await page.getByRole("textbox").fill("Accessible");
    await expectNoA11yViolations(page);
    await expectNoColorContrastViolations(page);
    await expectNoAriaViolations(page);
  });
});

test.describe("Accessibility smoke", () => {
  for (const slug of SMOKE_SLUGS) {
    test(`${slug} detail page passes WCAG scan`, async ({ page }) => {
      await expectPageAccessible(page, `/components/${slug}`);
    });
  }
});
