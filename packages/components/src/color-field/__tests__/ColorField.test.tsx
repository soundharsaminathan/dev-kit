import "@testing-library/jest-dom/vitest";
import { parseColor } from "@react-stately/color";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ColorPicker } from "../../color-picker/ColorPicker";
import { Field, Label } from "../../field/Field";
import { Input } from "../../input/Input";
import { ColorField } from "../ColorField";
import { useColorFieldContext } from "../color-field-context";

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

  it("marks invalid state", () => {
    const { container } = render(
      <ColorField defaultValue="#6366f1" aria-label="Hex" isInvalid />,
    );

    expect(container.querySelector("[data-color-field]")).toHaveAttribute(
      "data-invalid",
      "true",
    );
  });

  it("renders a custom input child", () => {
    render(
      <ColorField defaultValue="#6366f1" aria-label="Hex">
        <Input />
      </ColorField>,
    );

    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("throws when color field context is missing", () => {
    function ContextConsumer() {
      useColorFieldContext("Test");
      return null;
    }

    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<ContextConsumer />)).toThrow(
      "Test must be used within ColorField",
    );

    consoleError.mockRestore();
  });

  it("uses aria-label for field labeling", () => {
    render(<ColorField aria-label="Accent" defaultValue="#6366f1" />);
    expect(screen.getByRole("textbox", { name: "Accent" })).toBeInTheDocument();
  });

  it("renders the default input when children are omitted", () => {
    render(<ColorField defaultValue="#6366f1" aria-label="Hex" />);
    expect(screen.getByRole("textbox", { name: "Hex" })).toBeInTheDocument();
  });

  it("renders inside Field with shared input id", () => {
    render(
      <Field>
        <Label>Hex</Label>
        <ColorField defaultValue="#6366f1" aria-label="Hex value" />
      </Field>,
    );

    const input = screen.getByRole("textbox", { name: "Hex value" });
    expect(input.id).toBeTruthy();
    expect(screen.getByText("Hex").closest("label")).toBeTruthy();
  });

  it("shares color state with a parent color picker", () => {
    render(
      <ColorPicker defaultValue="#6366f1">
        <ColorField aria-label="Hex" />
      </ColorPicker>,
    );

    expect(screen.getByRole("textbox")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "#ff0000" },
    });
    expect(screen.getByRole("textbox")).not.toHaveValue("#6366f1");
  });

  it("supports read-only channel fields without colorSpace", () => {
    render(
      <ColorField
        defaultValue={parseColor("#6366f1")}
        channel="alpha"
        aria-label="Alpha"
        isReadOnly
      />,
    );

    expect(screen.getByRole("textbox")).toHaveAttribute("readonly");
  });

  it("passes through non-element children", () => {
    render(
      <ColorField defaultValue="#6366f1" aria-label="Hex">
        Plain text child
      </ColorField>,
    );

    expect(screen.getByText("Plain text child")).toBeInTheDocument();
  });

  it("marks read-only regular color fields", () => {
    render(<ColorField defaultValue="#6366f1" aria-label="Hex" isReadOnly />);

    expect(screen.getByRole("textbox", { name: "Hex" })).toHaveAttribute(
      "readonly",
    );
  });
});
