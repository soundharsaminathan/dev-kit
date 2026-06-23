import { afterEach, describe, expect, it, vi } from "vitest";
import {
  collectReactAriaLabelWarnings,
  installReactAriaLabelWarningGuard,
  isReactAriaLabelWarning,
  withReactAriaLabelWarningGuard,
} from "../react-aria-warnings";

describe("react-aria-warnings", () => {
  it("detects React Aria label warnings", () => {
    expect(
      isReactAriaLabelWarning(
        "If you do not provide a visible label, you must specify an aria-label or aria-labelledby attribute",
      ),
    ).toBe(true);
    expect(isReactAriaLabelWarning("unrelated warning")).toBe(false);
  });

  it("collects matching console warnings", () => {
    const guard = collectReactAriaLabelWarnings();

    console.warn("unrelated warning");
    console.warn(
      "If you do not provide a visible label, you must specify an aria-label or aria-labelledby attribute",
    );

    expect(guard.warnings).toHaveLength(1);
    guard.restore();
  });

  it("runs callbacks and asserts no label warnings", async () => {
    await withReactAriaLabelWarningGuard(() => {
      console.warn("safe warning");
    });
  });

  it("fails when React Aria label warnings are emitted", async () => {
    await expect(
      withReactAriaLabelWarningGuard(() => {
        console.warn(
          "If you do not provide a visible label, you must specify an aria-label or aria-labelledby attribute",
        );
      }),
    ).rejects.toThrow();
  });

  it("installs an afterEach guard", () => {
    const guard = installReactAriaLabelWarningGuard();
    expect(guard.warnings).toEqual([]);
    guard.restore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});
