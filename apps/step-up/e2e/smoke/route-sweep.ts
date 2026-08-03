import { expect, type Page } from "@playwright/test";
import { waitForAppReady } from "./fixtures";

/**
 * Visit a path and assert the shell rendered for an authenticated role:
 * no login redirect, no obvious error/not-found boundary, and interactive content.
 */
export async function sweepPath(
  page: Page,
  pathName: string,
  options?: {
    /** Expected URL pattern after navigation (defaults to staying on path). */
    stayOn?: RegExp;
    /** Paths that intentionally redirect away (permission denial). */
    denyRedirect?: RegExp;
  },
) {
  await page.goto(pathName, { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);

  if (options?.denyRedirect) {
    await expect(page).toHaveURL(options.denyRedirect);
    await expect(page).not.toHaveURL(/\/login/);
    return;
  }

  await expect(page).not.toHaveURL(/\/login/);
  if (options?.stayOn) {
    await expect(page).toHaveURL(options.stayOn);
  } else {
    const escaped = pathName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    await expect(page).toHaveURL(new RegExp(escaped));
  }

  // Avoid bare "404" — chip labels like "20–40"+"40+" concatenate to "4040".
  const errorCopy = page.getByText(
    /something went wrong|unexpected error|page not found/i,
  );
  const errorCount = await errorCopy.count();
  if (errorCount > 0) {
    const matched = (await errorCopy.allTextContents()).join(" | ");
    throw new Error(
      `Path sweep found error copy on ${pathName}: ${matched.slice(0, 240)}`,
    );
  }

  await expect
    .poll(async () => {
      return (
        (await page.getByRole("heading").count()) +
        (await page.getByRole("button").count()) +
        (await page.getByRole("link").count()) +
        (await page.getByRole("textbox").count())
      );
    })
    .toBeGreaterThan(0);
}

export async function sweepPaths(page: Page, paths: string[]) {
  for (const pathName of paths) {
    await sweepPath(page, pathName);
  }
}
