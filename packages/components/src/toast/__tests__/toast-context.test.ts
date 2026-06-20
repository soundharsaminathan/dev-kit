import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useToastContext } from "../toast-context";

describe("useToastContext", () => {
  it("throws when used outside ToastProvider", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => renderHook(() => useToastContext("ToastRegion"))).toThrow(
      "ToastRegion must be used within ToastProvider",
    );

    consoleError.mockRestore();
  });
});
