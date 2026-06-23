import type { Page } from "@playwright/test";
import type {
  ControlValues,
  SerializableControl,
} from "../../src/modules/showcase/types";
import { formatControlLabel } from "./control-labels";
import {
  getControlsPanel,
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

  const activeStates = Object.fromEntries(
    overlayControls.map((control) => [
      control.name,
      Boolean(defaults[control.name]),
    ]),
  );
  const targetStates = Object.fromEntries(
    overlayControls.map((control) => [
      control.name,
      Boolean(values[control.name] ?? defaults[control.name]),
    ]),
  );
  const otherControlsNeedChanges = controls.some(
    (control) =>
      !OVERLAY_INITIAL_CONTROLS.has(control.name) &&
      controlDiffers(control, values, defaults),
  );

  if (otherControlsNeedChanges) {
    for (const control of overlayControls) {
      if (activeStates[control.name]) {
        await toggleBooleanControl(page, formatControlLabel(control.name));
        activeStates[control.name] = false;
      }
    }
  }

  await applyNonOverlayInitialControls(page, controls, values, defaults);

  for (const control of overlayControls) {
    if (activeStates[control.name] !== targetStates[control.name]) {
      await toggleBooleanControl(page, formatControlLabel(control.name));
    }
  }
}

export async function waitForControlsPanel(page: Page) {
  await getControlsPanel(page).waitFor({ state: "visible" });
}
