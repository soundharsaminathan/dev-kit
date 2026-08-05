import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export const APP_MAIN = "main";

const WCAG_TAGS = ["wcag2a", "wcag2aa"] as const;

type AxeViolation = Awaited<
  ReturnType<InstanceType<typeof AxeBuilder>["analyze"]>
>["violations"][number];

export type A11yScanOptions = {
  include?: string;
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

export async function expectNoCriticalAxe(
  page: Page,
  options: A11yScanOptions = {},
) {
  let builder = new AxeBuilder({ page })
    .withTags([...WCAG_TAGS])
    .disableRules(["color-contrast"]);

  if (options.include) {
    builder = builder.include(options.include);
  }

  const results = await builder.analyze();
  const critical = results.violations.filter((v) => v.impact === "critical");
  expect(critical, formatViolations(critical)).toEqual([]);
}

export async function expectNoColorContrastViolations(
  page: Page,
  options: A11yScanOptions = {},
) {
  let builder = new AxeBuilder({ page }).withRules(["color-contrast"]);

  if (options.include) {
    builder = builder.include(options.include);
  }

  const results = await builder.analyze();
  expect(results.violations, formatViolations(results.violations)).toEqual([]);
}
