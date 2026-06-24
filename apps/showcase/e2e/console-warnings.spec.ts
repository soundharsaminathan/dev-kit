import { test } from "@playwright/test";
import { expectNoReactAriaLabelWarningsOnPage } from "./helpers/console-warnings";

const PAGES_WITH_ENUM_CONTROLS = [
  "/components/button",
  "/components/badge",
  "/components/select",
] as const;

test.describe("Console warnings", () => {
  for (const path of PAGES_WITH_ENUM_CONTROLS) {
    test(`${path} has no React Aria label warnings`, async ({ page }) => {
      await expectNoReactAriaLabelWarningsOnPage(page, path);
    });
  }
});
