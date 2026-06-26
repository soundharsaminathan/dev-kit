import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import { DEFAULT_GLOBALS, gotoStory, STORY_ROOT } from "./storybook";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] as const;

type AxeViolation = Awaited<
  ReturnType<InstanceType<typeof AxeBuilder>["analyze"]>
>["violations"][number];

export type A11yScanOptions = {
  /** Limit scan to the Storybook story mount. Default true when no `beforeScan`. */
  scopeToStory?: boolean;
  /** Prepare interactive state before scanning (e.g. open a menu). */
  beforeScan?: (page: Page) => undefined | Promise<unknown>;
};

export type StoryA11yOptions = A11yScanOptions & {
  globals?: Record<string, string>;
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
  const { beforeScan, scopeToStory = beforeScan === undefined } = options;

  if (beforeScan) {
    await beforeScan(page);
  }

  let builder = new AxeBuilder({ page }).withTags([...WCAG_TAGS]);

  if (scopeToStory) {
    builder = builder.include(STORY_ROOT);
  }

  const results = await builder.analyze();

  expect(results.violations, formatViolations(results.violations)).toEqual([]);
}

export async function expectStoryAccessible(
  page: Page,
  storyId: string,
  options: StoryA11yOptions = {},
) {
  const { globals = DEFAULT_GLOBALS, ...scanOptions } = options;
  await gotoStory(page, storyId, globals);
  await expectNoA11yViolations(page, scanOptions);
}
