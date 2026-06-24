import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export const APP_MAIN = "main";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] as const;

const ARIA_RULES = [
  "aria-allowed-attr",
  "aria-hidden-body",
  "aria-hidden-focus",
  "aria-input-field-name",
  "aria-required-attr",
  "aria-required-children",
  "aria-required-parent",
  "aria-roles",
  "aria-valid-attr",
  "aria-valid-attr-value",
  "button-name",
  "label",
  "link-name",
] as const;

type AxeViolation = Awaited<
  ReturnType<InstanceType<typeof AxeBuilder>["analyze"]>
>["violations"][number];

export type A11yScanOptions = {
  scopeToMain?: boolean;
  beforeScan?: (page: Page) => Promise<void>;
};

function formatViolations(violations: AxeViolation[]) {
  if (violations.length === 0) {
    return "";
  }

  return violations
    .map((violation) => {
      const targets = violation.nodes
        .map((node) => node.target.join(" "))
        .join("\n    ");
      return `[${violation.impact}] ${violation.id}: ${violation.help}\n    ${targets}`;
    })
    .join("\n\n");
}

export async function expectNoA11yViolations(
  page: Page,
  options: A11yScanOptions = {},
) {
  const { beforeScan, scopeToMain = beforeScan === undefined } = options;

  if (beforeScan) {
    await beforeScan(page);
  }

  let builder = new AxeBuilder({ page }).withTags([...WCAG_TAGS]);

  if (scopeToMain) {
    builder = builder.include(APP_MAIN);
  }

  const results = await builder.analyze();
  expect(results.violations, formatViolations(results.violations)).toEqual([]);
}

export async function expectNoColorContrastViolations(
  page: Page,
  options: A11yScanOptions = {},
) {
  const { beforeScan, scopeToMain = beforeScan === undefined } = options;

  if (beforeScan) {
    await beforeScan(page);
  }

  let builder = new AxeBuilder({ page }).withRules(["color-contrast"]);

  if (scopeToMain) {
    builder = builder.include(APP_MAIN);
  }

  const results = await builder.analyze();
  expect(results.violations, formatViolations(results.violations)).toEqual([]);
}

export async function expectNoAriaViolations(
  page: Page,
  options: A11yScanOptions = {},
) {
  const { beforeScan, scopeToMain = beforeScan === undefined } = options;

  if (beforeScan) {
    await beforeScan(page);
  }

  let builder = new AxeBuilder({ page }).withRules([...ARIA_RULES]);

  if (scopeToMain) {
    builder = builder.include(APP_MAIN);
  }

  const results = await builder.analyze();
  expect(results.violations, formatViolations(results.violations)).toEqual([]);
}

export async function expectPageAccessible(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await expectNoA11yViolations(page);
}
