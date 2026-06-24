import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "../theme";

function ThemeConsumer() {
  const { preset, mode, presets, setPreset, setMode } = useTheme();

  return (
    <div>
      <span data-testid="preset">{preset}</span>
      <span data-testid="mode">{mode}</span>
      <span data-testid="preset-count">{presets.length}</span>
      <button
        type="button"
        onClick={() => setPreset(presets[1] ?? presets[0]!)}
      >
        Change preset
      </button>
      <button type="button" onClick={() => setMode("dark")}>
        Dark mode
      </button>
    </div>
  );
}

describe("ThemeProvider", () => {
  it("provides theme state and persists to localStorage", () => {
    localStorage.clear();

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("preset")).toHaveTextContent("modern-minimal");
    expect(screen.getByTestId("mode")).toHaveTextContent("light");
    expect(document.documentElement).toHaveAttribute(
      "data-theme-preset",
      "modern-minimal",
    );
    expect(document.documentElement).toHaveAttribute(
      "data-theme-mode",
      "light",
    );

    fireEvent.click(screen.getByRole("button", { name: "Dark mode" }));

    expect(screen.getByTestId("mode")).toHaveTextContent("dark");
    expect(localStorage.getItem("theme-mode")).toBe("dark");
    expect(document.documentElement).toHaveAttribute("data-theme-mode", "dark");
  });

  it("ignores invalid stored preset values", () => {
    localStorage.setItem("theme-preset", "not-a-real-preset");
    localStorage.setItem("theme-mode", "dark");

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("preset")).toHaveTextContent("modern-minimal");
    expect(screen.getByTestId("mode")).toHaveTextContent("dark");
  });

  it("throws when useTheme is used outside ThemeProvider", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<ThemeConsumer />)).toThrow(
      "useTheme must be used within ThemeProvider",
    );

    errorSpy.mockRestore();
  });
});
