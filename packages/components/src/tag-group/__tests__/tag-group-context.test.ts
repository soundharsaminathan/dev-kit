import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useTagGroupContext } from "../tag-group-context";

describe("useTagGroupContext", () => {
  it("throws when used outside TagGroup", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => renderHook(() => useTagGroupContext("TagList"))).toThrow(
      "TagList must be used within TagGroup",
    );

    consoleError.mockRestore();
  });
});
