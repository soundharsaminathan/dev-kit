import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ComponentCard } from "../component-card";

const navigate = vi.fn();

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router");
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

describe("ComponentCard", () => {
  it("renders component preview for registered slug", () => {
    render(<ComponentCard name="Button" slug="button" />);
    expect(screen.getByRole("link", { name: "Button" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Button" })).toBeInTheDocument();
  });

  it("navigates on click", () => {
    render(<ComponentCard name="Button" slug="button" />);
    fireEvent.click(screen.getByRole("link", { name: "Button" }));
    expect(navigate).toHaveBeenCalledWith({
      to: "/components/$slug",
      params: { slug: "button" },
    });
  });

  it("navigates on Enter key", () => {
    navigate.mockClear();
    render(<ComponentCard name="Button" slug="button" />);
    fireEvent.keyDown(screen.getByRole("link", { name: "Button" }), {
      key: "Enter",
    });
    expect(navigate).toHaveBeenCalled();
  });

  it("sets data-component attribute", () => {
    render(<ComponentCard name="Button" slug="button" />);
    expect(screen.getByRole("link", { name: "Button" })).toHaveAttribute(
      "data-component",
      "button",
    );
  });

  it("navigates on Space key", () => {
    navigate.mockClear();
    render(<ComponentCard name="Button" slug="button" />);
    fireEvent.keyDown(screen.getByRole("link", { name: "Button" }), {
      key: " ",
    });
    expect(navigate).toHaveBeenCalled();
  });

  it("renders placeholder when slug is missing from registry", () => {
    render(<ComponentCard name="Missing" slug="not-in-registry" />);
    expect(screen.getByRole("link", { name: "Missing" })).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
