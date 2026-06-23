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

async function applyNonDefaultOpenControls(
  page: Page,
  controls: SerializableControl[],
  values: ControlValues,
  defaults: ControlValues,
) {
  for (const control of controls) {
    if (control.name === "defaultOpen") {
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
  const hasDefaultOpen = controls.some(
    (control) => control.name === "defaultOpen" && control.type === "boolean",
  );
  const initialOpen = Boolean(defaults.defaultOpen);
  const targetOpen = Boolean(values.defaultOpen ?? defaults.defaultOpen);
  const otherControlsNeedChanges = controls.some(
    (control) =>
      control.name !== "defaultOpen" &&
      controlDiffers(control, values, defaults),
  );

  let overlayOpen = initialOpen;

  if (hasDefaultOpen && overlayOpen && otherControlsNeedChanges) {
    await toggleBooleanControl(page, formatControlLabel("defaultOpen"));
    overlayOpen = false;
  }

  await applyNonDefaultOpenControls(page, controls, values, defaults);

  if (hasDefaultOpen && overlayOpen !== targetOpen) {
    await toggleBooleanControl(page, formatControlLabel("defaultOpen"));
  }
}

export async function waitForControlsPanel(page: Page) {
  await getControlsPanel(page).waitFor({ state: "visible" });
}
