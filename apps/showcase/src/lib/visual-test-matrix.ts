import {
  type ControlValues,
  defaultControlValues,
  type SerializableControl,
} from "@/modules/showcase/types";
import { getAllRegistryEntries } from "@/registry";
import type { ComponentRegistryConfig } from "@/registry/types";

export interface VisualTestCase {
  slug: string;
  caseId: string;
  screenshotName: string;
  values: ControlValues;
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

  return cases;
}

export function generateVisualTestCases(): VisualTestCase[] {
  return getAllRegistryEntries().flatMap((entry) =>
    generateVisualTestCasesForConfig(entry.config),
  );
}
