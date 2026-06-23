import { expect, type Page } from "@playwright/test";

/** React Aria dev warning when a field has no associated label. */
export const REACT_ARIA_LABEL_WARNING =
  /visible label.*aria-label|aria-label or aria-labelledby/i;

export function isReactAriaLabelWarning(message: string): boolean {
  return REACT_ARIA_LABEL_WARNING.test(message);
}

export async function expectNoReactAriaLabelWarningsOnPage(
  page: Page,
  path: string,
) {
  const warnings: string[] = [];

  const onConsole = (message: { type: () => string; text: () => string }) => {
    if (
      message.type() === "warning" &&
      isReactAriaLabelWarning(message.text())
    ) {
      warnings.push(message.text());
    }
  };

  page.on("console", onConsole);

  try {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  } finally {
    page.off("console", onConsole);
  }

  expect(
    warnings,
    warnings.length > 0
      ? `React Aria label warnings on ${path}:\n${warnings.join("\n")}`
      : undefined,
  ).toEqual([]);
}
