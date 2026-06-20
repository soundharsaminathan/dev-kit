import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ColorField } from "../ColorField";

describe("ColorField", () => {
  it("renders a color field", () => {
    const { container } = render(
      <ColorField defaultValue="#6366f1" aria-label="Hex" />,
    );

    expect(container.querySelector("[data-color-field]")).toBeTruthy();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("marks disabled state", () => {
    const { container } = render(
      <ColorField defaultValue="#6366f1" aria-label="Hex" isDisabled />,
    );

    expect(container.querySelector("[data-color-field]")).toHaveAttribute(
      "data-disabled",
      "true",
    );
  });

  it("renders channel fields", () => {
    render(
      <ColorField
        defaultValue="#6366f1"
        colorSpace="rgb"
        channel="red"
        aria-label="Red"
      />,
    );

    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });
});
