import { expect, type Page } from "@playwright/test";
import type {
  ControlValues,
  SerializableControl,
} from "../../src/modules/showcase/types";
import { formatControlLabel } from "./control-labels";
import {
  getControlsPanel,
  getDemoFrame,
  setEnumControl,
  toggleBooleanControl,
} from "./screenshots";

const OVERLAY_INITIAL_CONTROLS = new Set(["defaultOpen", "defaultExpanded"]);

function controlDiffers(
  control: SerializableControl,
  values: ControlValues,
  defaults: ControlValues,
): boolean {
  if (control.type === "boolean") {
    return Boolean(values[control.name]) !== Boolean(defaults[control.name]);
  }

  if (control.type === "enum") {
    return String(values[control.name]) !== String(defaults[control.name]);
  }

  return false;
}

async function applyNonOverlayInitialControls(
  page: Page,
  controls: SerializableControl[],
  values: ControlValues,
  defaults: ControlValues,
) {
  for (const control of controls) {
    if (OVERLAY_INITIAL_CONTROLS.has(control.name)) {
      continue;
    }

    if (control.type === "boolean") {
      const target = Boolean(values[control.name]);
      const initial = Boolean(defaults[control.name]);
      if (target !== initial) {
        await toggleBooleanControl(page, formatControlLabel(control.name));
      }
      continue;
    }

    if (control.type === "enum") {
      const target = String(values[control.name]);
      const initial = String(defaults[control.name]);
      if (target !== initial) {
        await setEnumControl(page, formatControlLabel(control.name), target);
      }
    }
  }
}

function getDefaultOpenSurface(page: Page) {
  return page
    .locator(
      '[role="dialog"], [data-popover=""], [data-drawer=""], [data-modal], [data-menu-content=""], [role="menu"]',
    )
    .or(getDemoFrame(page).locator("[data-sidebar-container]"));
}

async function waitForDefaultOpenSurface(page: Page) {
  const surface = getDefaultOpenSurface(page);
  if (
    await surface
      .first()
      .isVisible()
      .catch(() => false)
  ) {
    return;
  }

  const demo = getDemoFrame(page);
  for (const name of [
    "Open modal",
    "Open dialog",
    "Open overlay",
    "Open drawer",
    "Trigger",
  ]) {
    const button = demo.getByRole("button", { name, exact: true });
    if (await button.isVisible().catch(() => false)) {
      await button.click();
      break;
    }
  }

  if (
    await surface
      .first()
      .isVisible()
      .catch(() => false)
  ) {
    return;
  }

  const defaultOpenLabel = formatControlLabel("defaultOpen");
  if (
    await getControlsPanel(page)
      .getByText(defaultOpenLabel, { exact: true })
      .isVisible()
      .catch(() => false)
  ) {
    await toggleBooleanControl(page, defaultOpenLabel);
    await toggleBooleanControl(page, defaultOpenLabel);
  }

  await expect(surface.first()).toBeVisible({ timeout: 10_000 });
}

async function waitForDefaultExpandedPanel(page: Page) {
  const panel = getDemoFrame(page).locator(
    '[data-disclosure-panel=""]:not([data-hidden="true"])',
  );
  if (await panel.isVisible().catch(() => false)) {
    return;
  }

  const trigger = getDemoFrame(page).locator('[data-disclosure-trigger=""]');
  if (await trigger.isVisible().catch(() => false)) {
    await trigger.click();
  }

  if (await panel.isVisible().catch(() => false)) {
    return;
  }

  const label = formatControlLabel("defaultExpanded");
  if (
    await getControlsPanel(page)
      .getByText(label, { exact: true })
      .isVisible()
      .catch(() => false)
  ) {
    await toggleBooleanControl(page, label);
    await toggleBooleanControl(page, label);
  }

  await expect(panel).toBeVisible({ timeout: 10_000 });
}

async function waitForOverlayInitialState(
  page: Page,
  values: ControlValues,
  defaults: ControlValues,
  overlayControls: SerializableControl[],
) {
  const isDisabled = Boolean(values.isDisabled);

  for (const control of overlayControls) {
    const shouldBeOpen = Boolean(
      values[control.name] ?? defaults[control.name],
    );
    if (!shouldBeOpen || isDisabled) {
      continue;
    }

    if (control.name === "defaultOpen") {
      await waitForDefaultOpenSurface(page);
      continue;
    }

    if (control.name === "defaultExpanded") {
      await waitForDefaultExpandedPanel(page);
    }
  }
}

export async function applyControlValues(
  page: Page,
  controls: SerializableControl[],
  values: ControlValues,
  defaults: ControlValues,
) {
  const overlayControls = controls.filter(
    (control) =>
      OVERLAY_INITIAL_CONTROLS.has(control.name) && control.type === "boolean",
  );

  if (overlayControls.length === 0) {
    await applyNonOverlayInitialControls(page, controls, values, defaults);
    return;
  }

  const overlayStates = Object.fromEntries(
    overlayControls.map((control) => [
      control.name,
      Boolean(defaults[control.name]),
    ]),
  );
  const overlayTargets = Object.fromEntries(
    overlayControls.map((control) => [
      control.name,
      Boolean(values[control.name] ?? defaults[control.name]),
    ]),
  );
  const needsOtherChanges = controls.some(
    (control) =>
      !OVERLAY_INITIAL_CONTROLS.has(control.name) &&
      controlDiffers(control, values, defaults),
  );
  const shouldCloseOverlayFirst = overlayControls.some(
    (control) => overlayStates[control.name] && needsOtherChanges,
  );

  if (shouldCloseOverlayFirst) {
    for (const control of overlayControls) {
      if (overlayStates[control.name]) {
        await toggleBooleanControl(page, formatControlLabel(control.name));
        overlayStates[control.name] = false;
      }
    }
  }

  await applyNonOverlayInitialControls(page, controls, values, defaults);

  for (const control of overlayControls) {
    if (overlayStates[control.name] !== overlayTargets[control.name]) {
      await toggleBooleanControl(page, formatControlLabel(control.name));
      overlayStates[control.name] = overlayTargets[control.name];
    }
  }

  await waitForOverlayInitialState(page, values, defaults, overlayControls);
}

export async function waitForControlsPanel(page: Page) {
  await getControlsPanel(page).waitFor({ state: "visible" });
}
