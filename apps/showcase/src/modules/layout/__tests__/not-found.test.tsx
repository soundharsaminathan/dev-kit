// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ComponentNotFound } from "@/modules/layout/not-found";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
      <a href={to}>{children}</a>
    ),
  };
});

describe("ComponentNotFound", () => {
  it("renders a recovery link", () => {
    render(<ComponentNotFound />);

    expect(
      screen.getByRole("heading", { name: "Component not found" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to components" }),
    ).toHaveAttribute("href", "/components");
  });
});
