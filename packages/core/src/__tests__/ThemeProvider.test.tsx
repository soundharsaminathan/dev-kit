// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "../ThemeProvider";

function createMatchMediaMock(
  getMatches: (query: string) => boolean,
  listeners?: {
    addEventListener?: MediaQueryList["addEventListener"] | undefined;
    removeEventListener?: MediaQueryList["removeEventListener"] | undefined;
    addListener?: ((handler: () => void) => void) | undefined;
    removeListener?: ((handler: () => void) => void) | undefined;
  },
): (query: string) => MediaQueryList {
  return (query: string) =>
    ({
      matches: getMatches(query),
      media: query,
      onchange: null,
      addEventListener:
        listeners !== undefined && "addEventListener" in listeners
          ? listeners.addEventListener
          : vi.fn(),
      removeEventListener:
        listeners !== undefined && "removeEventListener" in listeners
          ? listeners.removeEventListener
          : vi.fn(),
      addListener:
        listeners !== undefined && "addListener" in listeners
          ? listeners.addListener
          : vi.fn(),
      removeListener:
        listeners !== undefined && "removeListener" in listeners
          ? listeners.removeListener
          : vi.fn(),
      dispatchEvent: vi.fn(),
    }) as MediaQueryList;
}

function ThemeConsumer() {
  const { preset, mode, setPreset, setMode, toggleMode } = useTheme();

  return (
    <div>
      <span data-testid="preset">{preset}</span>
      <span data-testid="mode">{mode}</span>
      <button type="button" onClick={() => setPreset("ocean")}>
        Set preset
      </button>
      <button type="button" onClick={() => setMode("dark")}>
        Set dark
      </button>
      <button type="button" onClick={toggleMode}>
        Toggle mode
      </button>
    </div>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme-preset");
    document.documentElement.removeAttribute("data-theme-mode");

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: vi
        .fn()
        .mockImplementation(
          createMatchMediaMock(
            (query) => query === "(prefers-color-scheme: dark)",
          ),
        ),
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("applies default preset and system mode to the document root", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(document.documentElement).toHaveAttribute(
      "data-theme-preset",
      "modern-minimal",
    );
    expect(document.documentElement).toHaveAttribute("data-theme-mode", "dark");
    expect(screen.getByTestId("preset")).toHaveTextContent("modern-minimal");
    expect(screen.getByTestId("mode")).toHaveTextContent("dark");
  });

  it("restores preset and mode from localStorage", () => {
    localStorage.setItem("theme-preset", "forest");
    localStorage.setItem("theme-mode", "light");

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("preset")).toHaveTextContent("forest");
    expect(screen.getByTestId("mode")).toHaveTextContent("light");
  });

  it("persists preset and mode changes", () => {
    render(
      <ThemeProvider defaultMode="light">
        <ThemeConsumer />
      </ThemeProvider>,
    );

    act(() => {
      screen.getByRole("button", { name: "Set preset" }).click();
    });
    act(() => {
      screen.getByRole("button", { name: "Set dark" }).click();
    });

    expect(localStorage.getItem("theme-preset")).toBe("ocean");
    expect(localStorage.getItem("theme-mode")).toBe("dark");
    expect(document.documentElement).toHaveAttribute(
      "data-theme-preset",
      "ocean",
    );
    expect(document.documentElement).toHaveAttribute("data-theme-mode", "dark");
  });

  it("toggles between light and dark mode", () => {
    render(
      <ThemeProvider defaultMode="light">
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("mode")).toHaveTextContent("light");

    act(() => {
      screen.getByRole("button", { name: "Toggle mode" }).click();
    });
    expect(screen.getByTestId("mode")).toHaveTextContent("dark");
    expect(localStorage.getItem("theme-mode")).toBe("dark");

    act(() => {
      screen.getByRole("button", { name: "Toggle mode" }).click();
    });
    expect(screen.getByTestId("mode")).toHaveTextContent("light");
  });

  it("uses a storage key prefix when provided", () => {
    render(
      <ThemeProvider storageKeyPrefix="app" defaultMode="light">
        <ThemeConsumer />
      </ThemeProvider>,
    );

    act(() => {
      screen.getByRole("button", { name: "Set preset" }).click();
    });
    act(() => {
      screen.getByRole("button", { name: "Set dark" }).click();
    });

    expect(localStorage.getItem("app-theme-preset")).toBe("ocean");
    expect(localStorage.getItem("app-theme-mode")).toBe("dark");
  });

  it("updates mode when system preference changes", () => {
    let changeHandler: (() => void) | undefined;
    const addEventListener = vi.fn((_event: string, handler: () => void) => {
      changeHandler = handler;
    });
    const removeEventListener = vi.fn();

    vi.mocked(window.matchMedia).mockImplementation(
      createMatchMediaMock(() => false, {
        addEventListener,
        removeEventListener,
      }),
    );

    localStorage.setItem("theme-mode", "system");

    const { unmount } = render(
      <ThemeProvider defaultMode="system">
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("mode")).toHaveTextContent("light");

    vi.mocked(window.matchMedia).mockImplementation(
      createMatchMediaMock(
        (query) => query === "(prefers-color-scheme: dark)",
        {
          addEventListener,
          removeEventListener,
        },
      ),
    );

    act(() => {
      changeHandler?.();
    });

    expect(screen.getByTestId("mode")).toHaveTextContent("dark");

    unmount();
    expect(removeEventListener).toHaveBeenCalled();
  });

  it("falls back to legacy media query listeners", () => {
    let changeHandler: (() => void) | undefined;
    const addListener = vi.fn((handler: () => void) => {
      changeHandler = handler;
    });
    const removeListener = vi.fn();

    vi.mocked(window.matchMedia).mockImplementation(
      createMatchMediaMock(() => false, {
        addEventListener: undefined,
        removeEventListener: undefined,
        addListener,
        removeListener,
      }),
    );

    localStorage.setItem("theme-mode", "system");

    render(
      <ThemeProvider defaultMode="system">
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(addListener).toHaveBeenCalled();

    vi.mocked(window.matchMedia).mockImplementation(
      createMatchMediaMock(
        (query) => query === "(prefers-color-scheme: dark)",
        {
          addEventListener: undefined,
          removeEventListener: undefined,
          addListener,
          removeListener,
        },
      ),
    );

    act(() => {
      changeHandler?.();
    });

    expect(screen.getByTestId("mode")).toHaveTextContent("dark");
  });

  it("does not update mode when system preference changes while using an explicit mode", () => {
    let changeHandler: (() => void) | undefined;
    const addEventListener = vi.fn((_event: string, handler: () => void) => {
      changeHandler = handler;
    });

    vi.mocked(window.matchMedia).mockImplementation(
      createMatchMediaMock(() => false, {
        addEventListener,
        removeEventListener: vi.fn(),
      }),
    );

    render(
      <ThemeProvider defaultMode="light">
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("mode")).toHaveTextContent("light");

    vi.mocked(window.matchMedia).mockImplementation(
      createMatchMediaMock(
        (query) => query === "(prefers-color-scheme: dark)",
        { addEventListener, removeEventListener: vi.fn() },
      ),
    );

    act(() => {
      changeHandler?.();
    });

    expect(screen.getByTestId("mode")).toHaveTextContent("light");
  });

  it("uses light mode when matchMedia is unavailable", () => {
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: undefined,
    });

    render(
      <ThemeProvider defaultMode="system">
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("mode")).toHaveTextContent("light");

    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: originalMatchMedia,
    });
  });

  it("throws when useTheme is used outside ThemeProvider", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<ThemeConsumer />)).toThrow(
      "useTheme must be used within a ThemeProvider",
    );

    consoleError.mockRestore();
  });
});
