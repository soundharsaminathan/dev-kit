import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useDismissBootPublic } from "./use-dismiss-boot-public";

describe("useDismissBootPublic", () => {
  afterEach(() => {
    document.getElementById("boot-public")?.remove();
    document.documentElement.removeAttribute("data-boot-public");
  });

  it("removes the static shell as soon as React commits", () => {
    const shell = document.createElement("div");
    shell.id = "boot-public";
    document.body.appendChild(shell);
    document.documentElement.setAttribute("data-boot-public", "");

    renderHook(() => useDismissBootPublic());

    expect(document.getElementById("boot-public")).toBeNull();
    expect(document.documentElement.hasAttribute("data-boot-public")).toBe(
      false,
    );
  });
});
