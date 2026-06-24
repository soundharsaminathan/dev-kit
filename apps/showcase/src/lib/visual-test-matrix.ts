import { getComponentVisualInteraction } from "@/lib/component-visual-interactions";
import {
  type ControlValues,
  defaultControlValues,
  type SerializableControl,
} from "@/modules/showcase/types";
import { getAllRegistryEntries } from "@/registry";
import type {
  ComponentRegistryConfig,
  VisualInteraction,
} from "@/registry/types";

export interface VisualTestCase {
  slug: string;
  caseId: string;
  screenshotName: string;
  values: ControlValues;
  interaction?: VisualInteraction;
}

function visualControls(
  controls: SerializableControl[],
): SerializableControl[] {
  return controls.filter(
    (control) => control.type === "enum" || control.type === "boolean",
  );
}

function cartesianValues(
  controls: SerializableControl[],
): Record<string, unknown>[] {
  const axes = visualControls(controls);
  if (axes.length === 0) {
    return [{}];
  }

  let combinations: Record<string, unknown>[] = [{}];

  for (const control of axes) {
    const next: Record<string, unknown>[] = [];

    for (const combo of combinations) {
      if (control.type === "enum") {
        for (const option of control.options) {
          next.push({ ...combo, [control.name]: option });
        }
      } else {
        for (const value of [false, true] as const) {
          next.push({ ...combo, [control.name]: value });
        }
      }
    }

    combinations = next;
  }

  return combinations;
}

function formatCaseSegment(name: string, value: unknown): string {
  const normalized = String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${name}-${normalized || "empty"}`;
}

function buildCaseId(
  slug: string,
  partialValues: Record<string, unknown>,
  defaults: ControlValues,
): string {
  const keys = Object.keys(partialValues)
    .filter((key) => partialValues[key] !== defaults[key])
    .sort();

  if (keys.length === 0) {
    return slug;
  }

  return `${slug}--${keys
    .map((key) => formatCaseSegment(key, partialValues[key]))
    .join("--")}`;
}

function buildScreenshotName(caseId: string): string {
  return `playground-${caseId}.png`;
}

function buildInteractionCaseValues(
  controls: SerializableControl[],
  defaults: ControlValues,
): ControlValues {
  const values = { ...defaults };

  for (const control of controls) {
    if (
      (control.name === "defaultOpen" || control.name === "defaultExpanded") &&
      control.type === "boolean"
    ) {
      values[control.name] = false;
    }
  }

  return values;
}

function appendInteractionCase(
  config: ComponentRegistryConfig,
  defaults: ControlValues,
  cases: VisualTestCase[],
  seen: Set<string>,
) {
  const interaction = getComponentVisualInteraction(config.slug);
  if (!interaction) {
    return;
  }

  const caseId = `${config.slug}--open-interaction`;
  const values =
    config.normalizeControlValues?.(
      buildInteractionCaseValues(config.controls, defaults),
    ) ?? buildInteractionCaseValues(config.controls, defaults);
  const dedupeId = `${caseId}:${JSON.stringify(values)}:${interaction}`;

  if (seen.has(dedupeId)) {
    return;
  }
  seen.add(dedupeId);

  cases.push({
    slug: config.slug,
    caseId,
    screenshotName: buildScreenshotName(caseId),
    values,
    interaction,
  });
}

export function generateVisualTestCasesForConfig(
  config: ComponentRegistryConfig,
): VisualTestCase[] {
  const defaults = defaultControlValues(config.controls);
  const seen = new Set<string>();
  const cases: VisualTestCase[] = [];

  for (const partialValues of cartesianValues(config.controls)) {
    let values = { ...defaults, ...partialValues };
    values = config.normalizeControlValues?.(values) ?? values;

    const caseId = buildCaseId(config.slug, partialValues, defaults);
    const dedupeKey = JSON.stringify(values);
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);

    cases.push({
      slug: config.slug,
      caseId,
      screenshotName: buildScreenshotName(caseId),
      values,
    });
  }

  for (const extraCase of config.extraVisualCases ?? []) {
    const values = {
      ...defaults,
      ...extraCase.values,
    };
    const normalizedValues = config.normalizeControlValues?.(values) ?? values;
    const dedupeKey = JSON.stringify(normalizedValues);
    const interactionKey = extraCase.interaction ?? "";
    const dedupeId = `${extraCase.caseId}:${dedupeKey}:${interactionKey}`;

    if (seen.has(dedupeId)) {
      continue;
    }
    seen.add(dedupeId);

    cases.push({
      slug: config.slug,
      caseId: extraCase.caseId,
      screenshotName: buildScreenshotName(extraCase.caseId),
      values: normalizedValues,
      ...(extraCase.interaction !== undefined
        ? { interaction: extraCase.interaction }
        : {}),
    });
  }

  appendInteractionCase(config, defaults, cases, seen);

  return cases;
}

export function generateVisualTestCases(): VisualTestCase[] {
  return getAllRegistryEntries().flatMap((entry) =>
    generateVisualTestCasesForConfig(entry.config),
  );
}
