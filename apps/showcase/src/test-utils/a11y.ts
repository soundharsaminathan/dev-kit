import { expect } from "vitest";
import { axe } from "vitest-axe";

type AxeResults = Awaited<ReturnType<typeof axe>>;

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

function formatViolations(violations: AxeResults["violations"]) {
  return violations
    .map(
      (violation) => `[${violation.impact}] ${violation.id}: ${violation.help}`,
    )
    .join("\n");
}

function assertNoViolations(results: AxeResults) {
  expect(results.violations.length, formatViolations(results.violations)).toBe(
    0,
  );
}

export async function expectNoA11yViolations(container: Element) {
  const results = await axe(container, {
    runOnly: { type: "tag", values: [...WCAG_TAGS] },
  });
  assertNoViolations(results);
}

export async function expectNoColorContrastViolations(container: Element) {
  const results = await axe(container, {
    runOnly: { type: "rule", values: ["color-contrast"] },
  });
  assertNoViolations(results);
}

export async function expectNoAriaViolations(container: Element) {
  const results = await axe(container, {
    runOnly: { type: "rule", values: [...ARIA_RULES] },
  });
  assertNoViolations(results);
}
