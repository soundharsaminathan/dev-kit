import { expect, test } from "@playwright/test";

test.describe("Color slider", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/components/color-slider");
  });

  test("horizontal slider responds to keyboard input", async ({ page }) => {
    const output = page.locator("[data-color-slider-output]");
    const before = await output.textContent();

    const slider = page.getByRole("slider", { name: "Hue" });
    await slider.focus();
    await page.keyboard.press("ArrowRight");

    await expect(output).not.toHaveText(before ?? "");
  });

  test("horizontal track is tall enough for the thumb", async ({ page }) => {
    const track = page.locator("[data-color-slider-track]");
    const thumb = page.locator("[data-slot='color-thumb']");

    const trackBox = await track.boundingBox();
    const thumbBox = await thumb.boundingBox();

    expect(trackBox).toBeTruthy();
    expect(thumbBox).toBeTruthy();
    expect(trackBox!.height).toBeGreaterThanOrEqual(thumbBox!.height);
  });
});
