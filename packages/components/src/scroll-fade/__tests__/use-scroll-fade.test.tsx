import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render } from "@testing-library/react";
import { type CSSProperties, type ReactNode, useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useScrollFade } from "../use-scroll-fade";

function mockScrollMetrics(
  element: HTMLElement,
  metrics: {
    scrollWidth?: number;
    clientWidth?: number;
    scrollHeight?: number;
    clientHeight?: number;
    scrollLeft?: number;
    scrollTop?: number;
  },
) {
  const {
    scrollWidth = 100,
    clientWidth = 100,
    scrollHeight = 100,
    clientHeight = 100,
    scrollLeft = 0,
    scrollTop = 0,
  } = metrics;

  Object.defineProperty(element, "scrollWidth", {
    configurable: true,
    value: scrollWidth,
  });
  Object.defineProperty(element, "clientWidth", {
    configurable: true,
    value: clientWidth,
  });
  Object.defineProperty(element, "scrollHeight", {
    configurable: true,
    value: scrollHeight,
  });
  Object.defineProperty(element, "clientHeight", {
    configurable: true,
    value: clientHeight,
  });
  Object.defineProperty(element, "scrollLeft", {
    configurable: true,
    writable: true,
    value: scrollLeft,
  });
  Object.defineProperty(element, "scrollTop", {
    configurable: true,
    writable: true,
    value: scrollTop,
  });
}

function ScrollFadeHarness({
  style,
  children,
  onReady,
}: {
  style?: CSSProperties;
  children?: ReactNode;
  onReady?: (element: HTMLDivElement, recompute: () => void) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { recompute } = useScrollFade({ ref });

  return (
    <div
      ref={(node) => {
        ref.current = node;
        if (node) {
          onReady?.(node, recompute);
        }
      }}
      data-testid="scroll-fade"
      style={{
        width: 100,
        height: 100,
        overflow: "auto",
        ...style,
      }}
    >
      {children ?? (
        <div style={{ width: 300, height: 300 }}>Overflow content</div>
      )}
    </div>
  );
}

describe("useScrollFade", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("computes overflow state and exposes recompute", () => {
    let recompute: (() => void) | undefined;

    render(
      <ScrollFadeHarness
        onReady={(element, recomputeFn) => {
          recompute = recomputeFn;
          mockScrollMetrics(element, {
            scrollWidth: 300,
            clientWidth: 100,
            scrollHeight: 300,
            clientHeight: 100,
            scrollLeft: 40,
            scrollTop: 20,
          });
          recomputeFn();
        }}
      />,
    );

    const element = document.querySelector<HTMLElement>(
      "[data-testid='scroll-fade']",
    )!;

    expect(element).toHaveAttribute("data-has-overflow-x", "");
    expect(element).toHaveAttribute("data-has-overflow-y", "");
    expect(element).toHaveAttribute("data-overflow-x-start", "");
    expect(element).toHaveAttribute("data-overflow-y-start", "");
    expect(
      element.style.getPropertyValue("--scroll-area-overflow-x-start"),
    ).toBe("40px");
    expect(element.style.getPropertyValue("--scroll-area-overflow-y-end")).toBe(
      "180px",
    );
    expect(element).toHaveAttribute("tabindex", "0");

    act(() => {
      recompute?.();
    });
  });

  it("clears overflow attributes when content fits", () => {
    render(
      <ScrollFadeHarness
        onReady={(element, recompute) => {
          mockScrollMetrics(element, {
            scrollWidth: 100,
            clientWidth: 100,
            scrollHeight: 100,
            clientHeight: 100,
          });
          recompute();
        }}
      >
        <div style={{ width: 50, height: 50 }}>Small content</div>
      </ScrollFadeHarness>,
    );

    const element = document.querySelector<HTMLElement>(
      "[data-testid='scroll-fade']",
    )!;

    expect(element).not.toHaveAttribute("data-has-overflow-x");
    expect(element).not.toHaveAttribute("data-has-overflow-y");
    expect(element).toHaveAttribute("tabindex", "-1");
  });

  it("does not override an existing tabindex", () => {
    render(
      <ScrollFadeHarness
        onReady={(element, recompute) => {
          element.tabIndex = 2;
          mockScrollMetrics(element, {
            scrollWidth: 300,
            clientWidth: 100,
            scrollHeight: 300,
            clientHeight: 100,
          });
          recompute();
        }}
      />,
    );

    const element = document.querySelector<HTMLElement>(
      "[data-testid='scroll-fade']",
    )!;
    expect(element).toHaveAttribute("tabindex", "2");
  });

  it("marks user scrolling and clears the attribute after a timeout", () => {
    vi.useFakeTimers();

    render(
      <ScrollFadeHarness
        onReady={(element, recompute) => {
          mockScrollMetrics(element, {
            scrollWidth: 300,
            clientWidth: 100,
            scrollHeight: 300,
            clientHeight: 100,
          });
          recompute();
        }}
      />,
    );

    const element = document.querySelector<HTMLElement>(
      "[data-testid='scroll-fade']",
    )!;

    act(() => {
      fireEvent.wheel(element);
      fireEvent.scroll(element);
    });

    expect(element).toHaveAttribute("data-scrolling", "");

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(element).not.toHaveAttribute("data-scrolling");
  });

  it("marks user scroll from touch, pointer, and keyboard interactions", () => {
    vi.useFakeTimers();

    render(
      <ScrollFadeHarness
        onReady={(element, recompute) => {
          mockScrollMetrics(element, {
            scrollWidth: 300,
            clientWidth: 100,
            scrollHeight: 300,
            clientHeight: 100,
          });
          recompute();
        }}
      />,
    );

    const element = document.querySelector<HTMLElement>(
      "[data-testid='scroll-fade']",
    )!;

    for (const markScroll of [
      () => fireEvent.touchMove(element),
      () => fireEvent.pointerMove(element),
      () => fireEvent.pointerEnter(element),
      () => fireEvent.keyDown(element, { key: "ArrowDown" }),
    ]) {
      act(() => {
        markScroll();
        fireEvent.scroll(element);
      });

      expect(element).toHaveAttribute("data-scrolling", "");
      act(() => {
        vi.advanceTimersByTime(300);
      });
    }
  });

  it("recomputes overflow after DOM mutations", async () => {
    render(
      <ScrollFadeHarness
        onReady={(element, recompute) => {
          mockScrollMetrics(element, {
            scrollWidth: 100,
            clientWidth: 100,
            scrollHeight: 100,
            clientHeight: 100,
          });
          recompute();
        }}
      >
        <div data-testid="initial">Initial</div>
      </ScrollFadeHarness>,
    );

    const element = document.querySelector<HTMLElement>(
      "[data-testid='scroll-fade']",
    )!;
    expect(element).not.toHaveAttribute("data-has-overflow-x");

    await act(async () => {
      mockScrollMetrics(element, {
        scrollWidth: 300,
        clientWidth: 100,
        scrollHeight: 100,
        clientHeight: 100,
      });
      const child = document.createElement("div");
      child.style.width = "300px";
      element.append(child);
      await Promise.resolve();
    });

    expect(element).toHaveAttribute("data-has-overflow-x", "");
  });

  it("recomputes overflow after animations finish", async () => {
    render(
      <ScrollFadeHarness
        onReady={(element, recompute) => {
          mockScrollMetrics(element, {
            scrollWidth: 100,
            clientWidth: 100,
            scrollHeight: 100,
            clientHeight: 100,
          });
          element.getAnimations = vi.fn(() => [
            {
              finished: Promise.resolve().then(() => {
                mockScrollMetrics(element, {
                  scrollWidth: 300,
                  clientWidth: 100,
                  scrollHeight: 100,
                  clientHeight: 100,
                });
              }),
            },
          ]) as unknown as HTMLElement["getAnimations"];
          recompute();
        }}
      />,
    );

    const element = document.querySelector<HTMLElement>(
      "[data-testid='scroll-fade']",
    )!;

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(element).toHaveAttribute("data-has-overflow-x", "");
  });

  it("handles rtl overflow calculations", () => {
    render(
      <ScrollFadeHarness
        style={{ direction: "rtl" }}
        onReady={(element, recompute) => {
          mockScrollMetrics(element, {
            scrollWidth: 300,
            clientWidth: 100,
            scrollHeight: 100,
            clientHeight: 100,
            scrollLeft: 0,
          });
          recompute();
        }}
      />,
    );

    const element = document.querySelector<HTMLElement>(
      "[data-testid='scroll-fade']",
    )!;
    expect(element).toHaveAttribute("data-has-overflow-x", "");
  });

  it("registers overflow CSS properties when supported", async () => {
    vi.resetModules();

    const registerProperty = vi.fn();
    vi.stubGlobal("CSS", { registerProperty });

    const { useScrollFade: freshUseScrollFade } = await import(
      "../use-scroll-fade"
    );

    function RegisterHarness() {
      const ref = useRef<HTMLDivElement>(null);
      freshUseScrollFade({ ref });
      return <div ref={ref} data-testid="scroll-fade" />;
    }

    render(<RegisterHarness />);

    expect(registerProperty).toHaveBeenCalled();
  });

  it("ignores duplicate CSS property registration errors", () => {
    const registerProperty = vi.fn().mockImplementation(() => {
      throw new Error("already registered");
    });
    vi.stubGlobal("CSS", { registerProperty });

    expect(() =>
      render(
        <ScrollFadeHarness
          onReady={(element, recompute) => {
            mockScrollMetrics(element, {
              scrollWidth: 300,
              clientWidth: 100,
              scrollHeight: 300,
              clientHeight: 100,
            });
            recompute();
          }}
        />,
      ),
    ).not.toThrow();
  });

  it("cleans up listeners and timeouts on unmount", () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");

    const { unmount } = render(
      <ScrollFadeHarness
        onReady={(element, recompute) => {
          mockScrollMetrics(element, {
            scrollWidth: 300,
            clientWidth: 100,
            scrollHeight: 300,
            clientHeight: 100,
          });
          recompute();
        }}
      />,
    );

    const element = document.querySelector<HTMLElement>(
      "[data-testid='scroll-fade']",
    )!;

    act(() => {
      fireEvent.wheel(element);
      fireEvent.scroll(element);
    });

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it("snaps near-edge scroll offsets to the start or end", () => {
    render(
      <ScrollFadeHarness
        onReady={(element, recompute) => {
          mockScrollMetrics(element, {
            scrollWidth: 300,
            clientWidth: 100,
            scrollHeight: 100,
            clientHeight: 100,
            scrollLeft: 1,
            scrollTop: 0,
          });
          recompute();
        }}
      />,
    );

    const element = document.querySelector<HTMLElement>(
      "[data-testid='scroll-fade']",
    )!;
    expect(element).toHaveAttribute("data-overflow-x-end", "");
    expect(
      element.style.getPropertyValue("--scroll-area-overflow-x-start"),
    ).toBe("0px");
  });

  it("handles a missing scroll container ref during layout", () => {
    function NullRefHarness() {
      const ref = useRef<HTMLDivElement>(null);
      useScrollFade({ ref });
      return null;
    }

    expect(() => render(<NullRefHarness />)).not.toThrow();
  });

  it("ignores animation recompute failures", async () => {
    render(
      <ScrollFadeHarness
        onReady={(element, recompute) => {
          mockScrollMetrics(element, {
            scrollWidth: 100,
            clientWidth: 100,
            scrollHeight: 100,
            clientHeight: 100,
          });
          element.getAnimations = vi.fn(() => [
            { finished: Promise.reject(new Error("animation failed")) },
          ]) as unknown as HTMLElement["getAnimations"];
          recompute();
        }}
      />,
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  });

  it("skips CSS property registration in WebKit browsers", async () => {
    vi.resetModules();
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    });

    const registerProperty = vi.fn();
    vi.stubGlobal("CSS", { registerProperty });

    const { useScrollFade: freshUseScrollFade } = await import(
      "../use-scroll-fade"
    );

    function WebKitHarness() {
      const ref = useRef<HTMLDivElement>(null);
      freshUseScrollFade({ ref });
      return <div ref={ref} data-testid="scroll-fade" />;
    }

    render(<WebKitHarness />);

    expect(registerProperty).not.toHaveBeenCalled();
  });

  it("detects negative rtl scroll behavior", async () => {
    vi.resetModules();
    const originalCreateElement = document.createElement.bind(document);

    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      const element = originalCreateElement(tagName);
      if (tagName === "div") {
        let scrollLeft = 0;
        Object.defineProperty(element, "scrollLeft", {
          configurable: true,
          get: () => scrollLeft,
          set: (_value) => {
            scrollLeft = 0;
          },
        });
      }
      return element;
    });

    const { useScrollFade: freshUseScrollFade } = await import(
      "../use-scroll-fade"
    );

    function RtlHarness() {
      const ref = useRef<HTMLDivElement>(null);
      freshUseScrollFade({ ref });
      return (
        <div
          ref={(node) => {
            ref.current = node;
            if (node) {
              mockScrollMetrics(node, {
                scrollWidth: 300,
                clientWidth: 100,
                scrollHeight: 100,
                clientHeight: 100,
                scrollLeft: 0,
              });
            }
          }}
          data-testid="scroll-fade"
          style={{
            direction: "rtl",
            width: 100,
            height: 100,
            overflow: "auto",
          }}
        />
      );
    }

    render(<RtlHarness />);
    expect(
      document.querySelector("[data-testid='scroll-fade']"),
    ).toHaveAttribute("data-has-overflow-x", "");
  });

  it("detects positive-descending rtl scroll behavior", async () => {
    vi.resetModules();
    const originalCreateElement = document.createElement.bind(document);

    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      const element = originalCreateElement(tagName);
      if (tagName === "div") {
        let scrollLeft = 100;
        Object.defineProperty(element, "scrollLeft", {
          configurable: true,
          get: () => scrollLeft,
          set: (value) => {
            scrollLeft = value;
          },
        });
      }
      return element;
    });

    const { useScrollFade: freshUseScrollFade } = await import(
      "../use-scroll-fade"
    );

    function RtlHarness() {
      const ref = useRef<HTMLDivElement>(null);
      freshUseScrollFade({ ref });
      return (
        <div
          ref={ref}
          data-testid="scroll-fade"
          style={{
            direction: "rtl",
            width: 100,
            height: 100,
            overflow: "auto",
          }}
        >
          <div style={{ width: 300, height: 50 }}>Overflow</div>
        </div>
      );
    }

    render(<RtlHarness />);

    const element = document.querySelector<HTMLElement>(
      "[data-testid='scroll-fade']",
    )!;
    mockScrollMetrics(element, {
      scrollWidth: 300,
      clientWidth: 100,
      scrollHeight: 100,
      clientHeight: 100,
      scrollLeft: 100,
    });

    act(() => {
      element.dispatchEvent(new Event("scroll"));
    });

    expect(element).toHaveAttribute("data-has-overflow-x", "");
  });
});
