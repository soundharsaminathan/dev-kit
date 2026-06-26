import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { composeRefs } from "../compose-refs";

describe("composeRefs", () => {
  it("updates object refs", () => {
    const ref = createRef<HTMLDivElement>();
    const callback = composeRefs(ref);

    const node = { id: "node" } as HTMLDivElement;
    callback(node);

    expect(ref.current).toBe(node);
  });

  it("invokes callback refs", () => {
    const ref = vi.fn();
    const callback = composeRefs(ref);

    const node = { id: "node" } as HTMLDivElement;
    callback(node);

    expect(ref).toHaveBeenCalledWith(node);
  });

  it("composes multiple refs", () => {
    const first = createRef<HTMLDivElement>();
    const second = vi.fn();
    const callback = composeRefs(first, second, undefined, null);

    const node = { id: "node" } as HTMLDivElement;
    callback(node);

    expect(first.current).toBe(node);
    expect(second).toHaveBeenCalledWith(node);
  });
});
