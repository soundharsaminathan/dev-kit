import { expect, type Locator, type Page } from "@playwright/test";

export function getDemoFrame(page: Page): Locator {
  return page.getByTestId("demo-frame");
}

async function clickDemoButton(page: Page, name: string | RegExp) {
  const button = getDemoFrame(page).getByRole("button", { name });
  await button.waitFor({ state: "visible" });
  await button.click();
}

export function getContextMenuTrigger(page: Page): Locator {
  return getDemoFrame(page).locator('[data-context-menu=""]');
}

export function getMenuContent(page: Page): Locator {
  return page.locator('[data-menu-content=""]');
}

export async function openContextMenu(page: Page) {
  const trigger = getContextMenuTrigger(page);
  await trigger.waitFor({ state: "visible" });
  const box = await trigger.boundingBox();

  if (!box) {
    throw new Error("Could not measure context menu trigger bounds");
  }

  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, {
    button: "right",
  });
  await getMenuContent(page).waitFor({ state: "visible" });
  await expect(page.getByRole("menu")).toBeVisible();
}

export async function openMenu(page: Page) {
  await clickDemoButton(page, "Open menu");
  await getMenuContent(page).waitFor({ state: "visible" });
}

export async function openSelect(page: Page) {
  const trigger = getDemoFrame(page).locator('[data-select-trigger=""]');
  await trigger.waitFor({ state: "visible" });
  await trigger.click();
  await page.getByRole("listbox").waitFor({ state: "visible" });
}

export async function openCombobox(page: Page) {
  const input = getDemoFrame(page).getByRole("combobox");
  await input.waitFor({ state: "visible" });
  await input.focus();
  await page.getByRole("listbox").waitFor({ state: "visible" });
}

export async function openAutocomplete(page: Page) {
  const input = getDemoFrame(page).getByRole("searchbox");
  await input.waitFor({ state: "visible" });
  await input.focus();
  await page.getByRole("listbox").waitFor({ state: "visible" });
}

export async function openPopover(page: Page) {
  await clickDemoButton(page, "Trigger");
  await page.locator('[data-popover=""]').waitFor({ state: "visible" });
}

export async function openTooltip(page: Page) {
  const trigger = getDemoFrame(page).getByRole("button", {
    name: "Hover or tap me",
  });
  await trigger.waitFor({ state: "visible" });
  await trigger.focus();
  await page.locator('[data-tooltip-content=""]').waitFor({ state: "visible" });
}

export async function openModal(page: Page) {
  await clickDemoButton(page, "Open modal");
  await page.getByRole("dialog").waitFor({ state: "visible" });
}

export async function openDialog(page: Page) {
  await clickDemoButton(page, "Open dialog");
  await page.getByRole("dialog").waitFor({ state: "visible" });
}

export async function openDrawer(page: Page) {
  await clickDemoButton(page, "Open drawer");
  await page.locator('[data-drawer=""]').waitFor({ state: "visible" });
}

export async function openColorPicker(page: Page) {
  await clickDemoButton(page, "Pick color");
  await page.getByRole("dialog").waitFor({ state: "visible" });
}

export async function openDatePicker(page: Page) {
  const button = getDemoFrame(page).locator('[data-date-picker-button=""]');
  await button.waitFor({ state: "visible" });
  await button.click();
  await page
    .locator('[data-date-picker-dialog=""]')
    .waitFor({ state: "visible" });
}

export async function openDateRangePicker(page: Page) {
  const button = getDemoFrame(page).locator('[data-date-picker-button=""]');
  await button.waitFor({ state: "visible" });
  await button.click();
  await page
    .locator('[data-date-picker-dialog=""]')
    .waitFor({ state: "visible" });
}

export async function openDisclosure(page: Page) {
  const trigger = getDemoFrame(page)
    .locator('[data-disclosure-trigger=""]')
    .first();
  await trigger.waitFor({ state: "visible" });
  await trigger.click();
  const disclosure = getDemoFrame(page).locator('[data-disclosure=""]').first();
  await disclosure.waitFor({ state: "visible" });
  await expect(disclosure).toHaveAttribute("data-expanded", "true");
  await getDemoFrame(page)
    .locator('[data-disclosure-panel=""]')
    .first()
    .waitFor({ state: "visible" });
}

export async function openAccordion(page: Page) {
  await openDisclosure(page);
}

export async function showToast(page: Page) {
  await clickDemoButton(page, "Show toast");
  await page.locator('[data-toast=""]').waitFor({ state: "visible" });
}

export async function openOverlay(page: Page) {
  await clickDemoButton(page, "Open overlay");
  await page.getByRole("dialog").waitFor({ state: "visible" });
}

export async function openSidebar(page: Page) {
  await clickDemoButton(page, "Toggle sidebar");
  await getDemoFrame(page)
    .locator('[data-sidebar=""]')
    .waitFor({ state: "visible" });
}

export async function expandTree(page: Page) {
  const photosRow = getDemoFrame(page).getByRole("row", { name: /Photos/i });
  await photosRow.waitFor({ state: "visible" });
  await photosRow.getByRole("button").click();
  await getDemoFrame(page)
    .locator('[data-tree-item][data-expanded="true"]')
    .filter({ hasText: "Photos" })
    .waitFor({ state: "visible" });
}
