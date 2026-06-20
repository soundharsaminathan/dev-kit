import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useTreeContext, useTreeItemContext } from "../tree-context";

describe("tree context hooks", () => {
  it("throws when useTreeContext is used outside Tree", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => renderHook(() => useTreeContext("TreeItem"))).toThrow(
      "TreeItem must be used within Tree",
    );

    consoleError.mockRestore();
  });

  it("throws when useTreeItemContext is used outside TreeItem", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() =>
      renderHook(() => useTreeItemContext("TreeItemContent")),
    ).toThrow("TreeItemContent must be used within TreeItem");

    consoleError.mockRestore();
  });
});
