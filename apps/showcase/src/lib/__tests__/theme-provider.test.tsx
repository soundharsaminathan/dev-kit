import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppThemeProvider, useTheme } from "../theme";

function ThemeConsumer() {
  const { theme, mode, themes, setTheme, setMode } = useTheme();

  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="mode">{mode}</span>
      <span data-testid="theme-count">{themes.length}</span>
      <button
        type="button"
        onClick={() => setTheme(themes[1]?.id ?? themes[0]!.id)}
      >
        Change theme
      </button>
      <button type="button" onClick={() => setMode("dark")}>
        Set dark
      </button>
    </div>
  );
}

describe("ThemeProvider", () => {
  it("provides theme state and persists to localStorage", () => {
    localStorage.clear();

    render(
      <AppThemeProvider>
        <ThemeConsumer />
      </AppThemeProvider>,
    );

    expect(screen.getByTestId("theme")).toHaveTextContent("default");
    expect(document.documentElement).toHaveAttribute("data-theme", "default");
    expect(document.documentElement).toHaveAttribute(
      "data-theme-mode",
      "light",
    );

    act(() => {
      screen.getByRole("button", { name: "Set dark" }).click();
    });
    expect(localStorage.getItem("dev-ui-theme-mode")).toBe("dark");
    expect(document.documentElement).toHaveAttribute("data-theme-mode", "dark");
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
