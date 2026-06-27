// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
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
  const { theme, mode, setTheme, setMode, toggleMode } = useTheme();

  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="mode">{mode}</span>
      <button type="button" onClick={() => setTheme("material")}>
        Set theme
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
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-theme-mode");
    document.getElementById("dev-ui-theme-overrides")?.remove();

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

  it("applies default theme and system mode to the document root", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(document.documentElement).toHaveAttribute("data-theme", "default");
    expect(document.documentElement).toHaveAttribute("data-theme-mode", "dark");
    expect(screen.getByTestId("theme")).toHaveTextContent("default");
    expect(screen.getByTestId("mode")).toHaveTextContent("dark");
  });

  it("restores theme and mode from localStorage", () => {
    localStorage.setItem("dev-ui-theme", "glassmorphism");
    localStorage.setItem("dev-ui-theme-mode", "light");

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme")).toHaveTextContent("glassmorphism");
    expect(screen.getByTestId("mode")).toHaveTextContent("light");
  });

  it("persists theme and mode changes", () => {
    render(
      <ThemeProvider defaultMode="light">
        <ThemeConsumer />
      </ThemeProvider>,
    );

    act(() => {
      screen.getByRole("button", { name: "Set theme" }).click();
    });
    act(() => {
      screen.getByRole("button", { name: "Set dark" }).click();
    });

    expect(localStorage.getItem("dev-ui-theme")).toBe("material");
    expect(localStorage.getItem("dev-ui-theme-mode")).toBe("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "material");
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
    expect(localStorage.getItem("dev-ui-theme-mode")).toBe("dark");

    act(() => {
      screen.getByRole("button", { name: "Toggle mode" }).click();
    });
    expect(screen.getByTestId("mode")).toHaveTextContent("light");
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

    localStorage.setItem("dev-ui-theme-mode", "system");

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

  it("throws when useTheme is used outside ThemeProvider", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<ThemeConsumer />)).toThrow(
      "useTheme must be used within a ThemeProvider",
    );

    consoleError.mockRestore();
  });

  it("applies live theme overrides without persisting the active theme id", () => {
    function LiveThemeConsumer() {
      const { setLiveTheme } = useTheme();

      return (
        <button
          type="button"
          onClick={() =>
            setLiveTheme({
              id: "custom-live",
              label: "Live",
              extends: "default",
              color: {
                algorithm: "oklch",
                seeds: {
                  neutral: "#808080",
                  accent: "#0000ff",
                  success: "#00aa00",
                  warning: "#ffaa00",
                  danger: "#aa0000",
                  info: "#0088ff",
                },
              },
            })
          }
        >
          Set live theme
        </button>
      );
    }

    render(
      <ThemeProvider defaultMode="light">
        <LiveThemeConsumer />
      </ThemeProvider>,
    );

    act(() => {
      screen.getByRole("button", { name: "Set live theme" }).click();
    });

    expect(document.documentElement).toHaveAttribute(
      "data-theme",
      "custom-live",
    );
    expect(localStorage.getItem("dev-ui-theme")).toBe("default");
    expect(document.getElementById("dev-ui-theme-overrides")).not.toBeNull();
  });

  it("saves and deletes custom themes", () => {
    function CustomThemeManager() {
      const { saveCustomTheme, deleteCustomTheme, customThemes } = useTheme();

      return (
        <div>
          <span data-testid="count">{customThemes.length}</span>
          <button
            type="button"
            onClick={() =>
              saveCustomTheme({
                label: "Saved",
                extends: "default",
                color: {
                  algorithm: "oklch",
                  seeds: {
                    neutral: "#808080",
                    accent: "#0000ff",
                    success: "#00aa00",
                    warning: "#ffaa00",
                    danger: "#aa0000",
                    info: "#0088ff",
                  },
                },
              })
            }
          >
            Save custom
          </button>
          <button
            type="button"
            onClick={() => deleteCustomTheme(customThemes[0]?.id ?? "")}
          >
            Delete custom
          </button>
        </div>
      );
    }

    render(
      <ThemeProvider defaultMode="light">
        <CustomThemeManager />
      </ThemeProvider>,
    );

    act(() => {
      screen.getByRole("button", { name: "Save custom" }).click();
    });
    expect(screen.getByTestId("count")).toHaveTextContent("1");

    act(() => {
      screen.getByRole("button", { name: "Delete custom" }).click();
    });
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("applies stylesheet when the active theme is a saved custom theme", () => {
    function CustomThemeSwitcher() {
      const { saveCustomTheme, setTheme } = useTheme();

      return (
        <button
          type="button"
          onClick={() => {
            const saved = saveCustomTheme({
              label: "Saved",
              extends: "default",
              color: {
                algorithm: "oklch",
                seeds: {
                  neutral: "#808080",
                  accent: "#0000ff",
                  success: "#00aa00",
                  warning: "#ffaa00",
                  danger: "#aa0000",
                  info: "#0088ff",
                },
              },
            });
            setTheme(saved.id);
          }}
        >
          Use custom theme
        </button>
      );
    }

    render(
      <ThemeProvider defaultMode="light">
        <CustomThemeSwitcher />
      </ThemeProvider>,
    );

    act(() => {
      screen.getByRole("button", { name: "Use custom theme" }).click();
    });

    const style = document.getElementById("dev-ui-theme-overrides");
    expect(style).not.toBeNull();
    expect(style?.textContent).toContain("--color-accent");
    expect(document.documentElement.getAttribute("data-theme")).toMatch(
      /^custom-/,
    );
  });

  it("defaults to light mode when matchMedia is unavailable", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: undefined,
    });
    localStorage.setItem("dev-ui-theme-mode", "system");

    render(
      <ThemeProvider defaultMode="system">
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("mode")).toHaveTextContent("light");
  });

  it("falls back to defaultMode when stored mode preference is invalid", () => {
    localStorage.setItem("dev-ui-theme-mode", "invalid");

    render(
      <ThemeProvider defaultMode="light">
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("mode")).toHaveTextContent("light");
  });

  it("resets active theme to default when deleting the current custom theme", () => {
    function DeleteActiveThemeConsumer() {
      const { saveCustomTheme, deleteCustomTheme, setTheme, theme } =
        useTheme();

      return (
        <div>
          <span data-testid="theme">{theme}</span>
          <button
            type="button"
            onClick={() => {
              const saved = saveCustomTheme({
                id: "custom-saved",
                label: "Saved",
                extends: "default",
                color: {
                  algorithm: "oklch",
                  seeds: {
                    neutral: "#808080",
                    accent: "#0000ff",
                    success: "#00aa00",
                    warning: "#ffaa00",
                    danger: "#aa0000",
                    info: "#0088ff",
                  },
                },
              });
              setTheme(saved.id);
            }}
          >
            Use saved theme
          </button>
          <button
            type="button"
            onClick={() => deleteCustomTheme("custom-saved")}
          >
            Delete active theme
          </button>
        </div>
      );
    }

    render(
      <ThemeProvider defaultMode="light">
        <DeleteActiveThemeConsumer />
      </ThemeProvider>,
    );

    act(() => {
      screen.getByRole("button", { name: "Use saved theme" }).click();
    });
    expect(screen.getByTestId("theme")).toHaveTextContent("custom-saved");

    act(() => {
      screen.getByRole("button", { name: "Delete active theme" }).click();
    });
    expect(screen.getByTestId("theme")).toHaveTextContent("default");
    expect(document.getElementById("dev-ui-theme-overrides")).toBeNull();
  });

  it("preserves a custom id when saving an existing custom theme", () => {
    function SaveWithIdConsumer() {
      const { saveCustomTheme, customThemes } = useTheme();

      return (
        <div>
          <span data-testid="id">{customThemes[0]?.id ?? "none"}</span>
          <button
            type="button"
            onClick={() =>
              saveCustomTheme({
                id: "custom-existing",
                label: "Existing",
                extends: "default",
                color: {
                  algorithm: "oklch",
                  seeds: {
                    neutral: "#808080",
                    accent: "#0000ff",
                    success: "#00aa00",
                    warning: "#ffaa00",
                    danger: "#aa0000",
                    info: "#0088ff",
                  },
                },
              })
            }
          >
            Save with id
          </button>
        </div>
      );
    }

    render(
      <ThemeProvider defaultMode="light">
        <SaveWithIdConsumer />
      </ThemeProvider>,
    );

    act(() => {
      screen.getByRole("button", { name: "Save with id" }).click();
    });

    expect(screen.getByTestId("id")).toHaveTextContent("custom-existing");
  });

  it("clears custom stylesheet when switching back to a built-in theme", () => {
    function ThemeSwitcher() {
      const { saveCustomTheme, setTheme } = useTheme();

      return (
        <button
          type="button"
          onClick={() => {
            const saved = saveCustomTheme({
              label: "Saved",
              extends: "default",
              color: {
                algorithm: "oklch",
                seeds: {
                  neutral: "#808080",
                  accent: "#0000ff",
                  success: "#00aa00",
                  warning: "#ffaa00",
                  danger: "#aa0000",
                  info: "#0088ff",
                },
              },
            });
            setTheme(saved.id);
            setTheme("default");
          }}
        >
          Switch back
        </button>
      );
    }

    render(
      <ThemeProvider defaultMode="light">
        <ThemeSwitcher />
      </ThemeProvider>,
    );

    act(() => {
      screen.getByRole("button", { name: "Switch back" }).click();
    });

    expect(document.getElementById("dev-ui-theme-overrides")).toBeNull();
    expect(document.documentElement).toHaveAttribute("data-theme", "default");
  });

  it("clears live theme overrides and restores the saved theme", () => {
    function LiveThemeToggle() {
      const { setLiveTheme } = useTheme();

      return (
        <>
          <button
            type="button"
            onClick={() =>
              setLiveTheme({
                id: "custom-live",
                label: "Live",
                extends: "default",
                color: {
                  algorithm: "oklch",
                  seeds: {
                    neutral: "#808080",
                    accent: "#0000ff",
                    success: "#00aa00",
                    warning: "#ffaa00",
                    danger: "#aa0000",
                    info: "#0088ff",
                  },
                },
              })
            }
          >
            Set live theme
          </button>
          <button type="button" onClick={() => setLiveTheme(null)}>
            Clear live theme
          </button>
        </>
      );
    }

    render(
      <ThemeProvider defaultMode="light">
        <LiveThemeToggle />
      </ThemeProvider>,
    );

    act(() => {
      screen.getByRole("button", { name: "Set live theme" }).click();
    });
    expect(document.documentElement).toHaveAttribute(
      "data-theme",
      "custom-live",
    );

    act(() => {
      screen.getByRole("button", { name: "Clear live theme" }).click();
    });
    expect(document.documentElement).toHaveAttribute("data-theme", "default");
  });

  it("updates an existing theme stylesheet when re-applying custom styles", () => {
    function ThemeStyleUpdater() {
      const { saveCustomTheme, setTheme } = useTheme();

      return (
        <button
          type="button"
          onClick={() => {
            const first = saveCustomTheme({
              label: "First",
              extends: "default",
              color: {
                algorithm: "oklch",
                seeds: {
                  neutral: "#808080",
                  accent: "#0000ff",
                  success: "#00aa00",
                  warning: "#ffaa00",
                  danger: "#aa0000",
                  info: "#0088ff",
                },
              },
            });
            setTheme(first.id);
            const second = saveCustomTheme({
              id: first.id,
              label: "Second",
              extends: "default",
              color: {
                algorithm: "oklch",
                seeds: {
                  neutral: "#909090",
                  accent: "#0000ff",
                  success: "#00aa00",
                  warning: "#ffaa00",
                  danger: "#aa0000",
                  info: "#0088ff",
                },
              },
            });
            setTheme(second.id);
          }}
        >
          Update theme styles
        </button>
      );
    }

    render(
      <ThemeProvider defaultMode="light">
        <ThemeStyleUpdater />
      </ThemeProvider>,
    );

    act(() => {
      screen.getByRole("button", { name: "Update theme styles" }).click();
    });

    const style = document.getElementById("dev-ui-theme-overrides");
    expect(style).not.toBeNull();
    expect(document.querySelectorAll("#dev-ui-theme-overrides")).toHaveLength(
      1,
    );
  });

  it("ignores system preference updates when mode preference is not system", () => {
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

  it("uses legacy media query listeners when addEventListener is unavailable", () => {
    const addListener = vi.fn();
    const removeListener = vi.fn();

    vi.mocked(window.matchMedia).mockImplementation(
      createMatchMediaMock(() => false, {
        addEventListener: undefined,
        removeEventListener: undefined,
        addListener,
        removeListener,
      }),
    );

    localStorage.setItem("dev-ui-theme-mode", "system");

    const { unmount } = render(
      <ThemeProvider defaultMode="system">
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(addListener).toHaveBeenCalled();
    unmount();
    expect(removeListener).toHaveBeenCalled();
  });
});

/**
 * @vitest-environment node
 */
describe("ThemeProvider SSR", () => {
  it("renders children without browser globals", () => {
    const html = renderToString(
      <ThemeProvider defaultMode="light">
        <span>Themed content</span>
      </ThemeProvider>,
    );

    expect(html).toContain("Themed content");
  });

  it("defaults system mode to light when matchMedia is unavailable", () => {
    const html = renderToString(
      <ThemeProvider defaultMode="system">
        <span data-mode="probe">System mode</span>
      </ThemeProvider>,
    );

    expect(html).toContain("System mode");
  });
});
