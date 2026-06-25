// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode, Ref } from "react";
import { describe, expect, it, vi } from "vitest";
import { ShowcaseSidebar } from "@/modules/layout/showcase-sidebar";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useLocation: () => ({
      pathname: "/components/button",
      search: {},
      hash: "",
      href: "/components/button",
      state: {},
    }),
    Link: ({
      children,
      className,
      ref,
      to,
    }: {
      children: ReactNode;
      className?: string;
      ref?: Ref<HTMLAnchorElement>;
      to: string;
    }) => (
      <a href={to} className={className} ref={ref}>
        {children}
      </a>
    ),
  };
});

describe("ShowcaseSidebar", () => {
  it("renders categories and marks the active component", () => {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });

    render(<ShowcaseSidebar />);

    expect(
      screen.getByRole("navigation", { name: "Components" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Buttons" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Button" }).className).toContain(
      "linkActive",
    );
  });
});
