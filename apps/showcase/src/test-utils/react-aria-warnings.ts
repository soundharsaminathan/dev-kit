import { afterEach, expect, vi } from "vitest";

/** React Aria dev warning when a field has no associated label. */
export const REACT_ARIA_LABEL_WARNING =
  /visible label.*aria-label|aria-label or aria-labelledby/i;

export function isReactAriaLabelWarning(message: string): boolean {
  return REACT_ARIA_LABEL_WARNING.test(message);
}

export function collectReactAriaLabelWarnings() {
  const warnings: string[] = [];

  const spy = vi
    .spyOn(console, "warn")
    .mockImplementation((...args: unknown[]) => {
      const message = args.map(String).join(" ");
      if (isReactAriaLabelWarning(message)) {
        warnings.push(message);
      }
    });

  return {
    warnings,
    expectNone() {
      expect(
        warnings,
        warnings.length > 0
          ? `React Aria label warnings:\n${warnings.join("\n")}`
          : undefined,
      ).toEqual([]);
    },
    restore() {
      spy.mockRestore();
    },
  };
}

export function withReactAriaLabelWarningGuard(
  run: () => void | Promise<void>,
): Promise<void> {
  const guard = collectReactAriaLabelWarnings();

  return Promise.resolve(run()).finally(() => {
    guard.expectNone();
    guard.restore();
  });
}

export function installReactAriaLabelWarningGuard() {
  const guard = collectReactAriaLabelWarnings();

  afterEach(() => {
    guard.expectNone();
    guard.restore();
  });

  return guard;
}
