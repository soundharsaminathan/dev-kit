// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { AppThemeProvider } from "@/lib/theme";
import { Header } from "@/modules/layout/header";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({
      children,
      to,
      className,
      activeProps,
    }: {
      children: ReactNode;
      to: string;
      className?: string;
      activeProps?: { className?: string };
    }) => (
      <a href={to} className={activeProps?.className ?? className}>
        {children}
      </a>
    ),
  };
});

describe("Header", () => {
  it("renders navigation and theme controls", () => {
    render(
      <AppThemeProvider>
        <Header />
      </AppThemeProvider>,
    );

    expect(
      screen.getByRole("link", { name: "Component Showcase" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Edit theme" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Theme")).not.toBeInTheDocument();
  });

  it("updates theme mode from the toggle group", () => {
    render(
      <AppThemeProvider>
        <Header />
      </AppThemeProvider>,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Dark" }));
    expect(document.documentElement.getAttribute("data-theme-mode")).toBe(
      "dark",
    );

    fireEvent.click(screen.getByRole("radio", { name: "Light" }));
    expect(document.documentElement.getAttribute("data-theme-mode")).toBe(
      "light",
    );
  });
});
