import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useImageLoadingStatus } from "../use-image-loading-status";

type ImageBehavior = "load" | "error" | "pending";

function setupImageMock(behavior: ImageBehavior = "load") {
  const instances: Array<{
    onload: (() => void) | null;
    onerror: (() => void) | null;
    referrerPolicy: string;
    crossOrigin: string | null;
    src: string;
  }> = [];

  class MockImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    referrerPolicy = "";
    crossOrigin: string | null = null;
    private _src = "";

    constructor() {
      instances.push(this);
    }

    set src(value: string) {
      this._src = value;
      if (behavior === "load") {
        queueMicrotask(() => this.onload?.());
      } else if (behavior === "error") {
        queueMicrotask(() => this.onerror?.());
      }
    }

    get src() {
      return this._src;
    }
  }

  vi.stubGlobal("Image", MockImage);

  return {
    instances,
    triggerLoad: () => {
      const image = instances.at(-1);
      image?.onload?.();
    },
    triggerError: () => {
      const image = instances.at(-1);
      image?.onerror?.();
    },
  };
}

describe("useImageLoadingStatus", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns error when src is missing", () => {
    const { result } = renderHook(() => useImageLoadingStatus(undefined));
    expect(result.current).toBe("error");
  });

  it("returns error when src is empty", () => {
    const { result } = renderHook(() => useImageLoadingStatus(""));
    expect(result.current).toBe("error");
  });

  it("transitions to loaded on successful load", async () => {
    setupImageMock("load");
    const { result } = renderHook(() => useImageLoadingStatus("/avatar.png"));

    await waitFor(() => {
      expect(result.current).toBe("loaded");
    });
  });

  it("transitions to error on failed load", async () => {
    setupImageMock("error");
    const { result } = renderHook(() => useImageLoadingStatus("/bad.png"));

    await waitFor(() => {
      expect(result.current).toBe("error");
    });
  });

  it("applies referrerPolicy and crossOrigin to the preload image", async () => {
    const { instances } = setupImageMock("pending");
    renderHook(() =>
      useImageLoadingStatus("/avatar.png", {
        referrerPolicy: "no-referrer",
        crossOrigin: "anonymous",
      }),
    );

    await waitFor(() => {
      expect(instances.length).toBeGreaterThan(0);
    });

    const image = instances[0]!;
    expect(image.referrerPolicy).toBe("no-referrer");
    expect(image.crossOrigin).toBe("anonymous");
    expect(image.src).toBe("/avatar.png");
  });

  it("sets crossOrigin to null when not provided", async () => {
    const { instances } = setupImageMock("pending");
    renderHook(() => useImageLoadingStatus("/avatar.png"));

    await waitFor(() => {
      expect(instances.length).toBeGreaterThan(0);
    });

    expect(instances[0]!.crossOrigin).toBeNull();
  });

  it("does not update status after unmount", async () => {
    const { instances, triggerLoad } = setupImageMock("pending");
    const { unmount } = renderHook(() => useImageLoadingStatus("/avatar.png"));

    await waitFor(() => {
      expect(instances.length).toBeGreaterThan(0);
    });

    unmount();

    expect(() => act(() => triggerLoad())).not.toThrow();
  });

  it("reloads when src changes", async () => {
    setupImageMock("load");
    const { result, rerender } = renderHook(
      ({ src }) => useImageLoadingStatus(src),
      { initialProps: { src: "/first.png" } },
    );

    await waitFor(() => {
      expect(result.current).toBe("loaded");
    });

    rerender({ src: "/second.png" });

    await waitFor(() => {
      expect(result.current).toBe("loaded");
    });
  });
});
