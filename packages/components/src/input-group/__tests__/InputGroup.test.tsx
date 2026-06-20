import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Input } from "../../input/Input";
import { InputGroup, InputGroupAddon } from "../InputGroup";

describe("InputGroup", () => {
  it("renders an input group with addons", () => {
    render(
      <InputGroup data-testid="input-group">
        <InputGroupAddon>https://</InputGroupAddon>
        <Input aria-label="Website" />
      </InputGroup>,
    );
    expect(screen.getByTestId("input-group")).toBeInTheDocument();
    expect(screen.getByText("https://")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("applies size, disabled, and invalid state attributes", () => {
    render(
      <InputGroup data-testid="input-group" size="lg" isDisabled isInvalid>
        <Input aria-label="Website" />
      </InputGroup>,
    );

    const group = screen.getByTestId("input-group");
    expect(group).toHaveAttribute("data-size", "lg");
    expect(group).toHaveAttribute("data-disabled", "true");
    expect(group).toHaveAttribute("data-invalid", "true");
  });

  it("focuses the inner input when the group surface is clicked", () => {
    render(
      <InputGroup data-testid="input-group">
        <InputGroupAddon>https://</InputGroupAddon>
        <Input aria-label="Website" />
      </InputGroup>,
    );

    const input = screen.getByRole("textbox");
    const group = screen.getByTestId("input-group");

    fireEvent.pointerDown(group, { pointerType: "mouse" });

    expect(input).toHaveFocus();
    expect(group).toHaveAttribute("data-focus-within", "true");
  });

  it("does not steal focus from interactive children", () => {
    const onAddonClick = vi.fn();

    render(
      <InputGroup data-testid="input-group">
        <InputGroupAddon>
          <button type="button" onClick={onAddonClick}>
            Action
          </button>
        </InputGroupAddon>
        <Input aria-label="Website" />
      </InputGroup>,
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: "Action" }), {
      pointerType: "mouse",
    });

    expect(onAddonClick).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox")).not.toHaveFocus();
  });

  it("focuses the inner input on touch end for non-interactive targets", () => {
    render(
      <InputGroup data-testid="input-group">
        <Input aria-label="Website" />
      </InputGroup>,
    );

    const input = screen.getByRole("textbox");
    const group = screen.getByTestId("input-group");

    fireEvent.touchEnd(group);

    expect(input).toHaveFocus();
  });

  it("reflects hover state", () => {
    render(
      <InputGroup data-testid="input-group">
        <Input aria-label="Website" />
      </InputGroup>,
    );

    const group = screen.getByTestId("input-group");
    fireEvent.pointerEnter(group, { pointerType: "mouse" });

    expect(group).toHaveAttribute("data-hovered", "true");
  });

  it("does not reflect hover when disabled", () => {
    render(
      <InputGroup data-testid="input-group" isDisabled>
        <Input aria-label="Website" />
      </InputGroup>,
    );

    const group = screen.getByTestId("input-group");
    fireEvent.pointerEnter(group, { pointerType: "mouse" });

    expect(group).not.toHaveAttribute("data-hovered");
  });

  it("does not focus input on non-mouse pointer down", () => {
    render(
      <InputGroup data-testid="input-group">
        <Input aria-label="Website" />
      </InputGroup>,
    );

    const input = screen.getByRole("textbox");
    const group = screen.getByTestId("input-group");

    fireEvent.pointerDown(group, { pointerType: "touch" });

    expect(input).not.toHaveFocus();
  });

  it("calls custom pointer and touch handlers", () => {
    const onPointerDown = vi.fn();
    const onTouchEnd = vi.fn();

    render(
      <InputGroup
        data-testid="input-group"
        onPointerDown={onPointerDown}
        onTouchEnd={onTouchEnd}
      >
        <Input aria-label="Website" />
      </InputGroup>,
    );

    const group = screen.getByTestId("input-group");
    fireEvent.pointerDown(group, { pointerType: "mouse" });
    fireEvent.touchEnd(group);

    expect(onPointerDown).toHaveBeenCalledTimes(1);
    expect(onTouchEnd).toHaveBeenCalledTimes(1);
  });

  it("skips touch focus when default is prevented", () => {
    render(
      <InputGroup
        data-testid="input-group"
        onTouchEnd={(event) => event.preventDefault()}
      >
        <Input aria-label="Website" />
      </InputGroup>,
    );

    const input = screen.getByRole("textbox");
    const group = screen.getByTestId("input-group");

    fireEvent.touchEnd(group);

    expect(input).not.toHaveFocus();
  });

  it("skips touch focus for contenteditable targets", () => {
    render(
      <InputGroup data-testid="input-group">
        <div contentEditable suppressContentEditableWarning>
          Notes
        </div>
        <Input aria-label="Website" />
      </InputGroup>,
    );

    const input = screen.getByRole("textbox");
    const editable = screen.getByText("Notes");
    Object.defineProperty(editable, "isContentEditable", { value: true });

    fireEvent.touchEnd(editable);

    expect(input).not.toHaveFocus();
  });

  it("clears focus-within when focus leaves the group", () => {
    render(
      <InputGroup data-testid="input-group">
        <Input aria-label="Website" />
      </InputGroup>,
    );

    const input = screen.getByRole("textbox");
    const group = screen.getByTestId("input-group");

    act(() => {
      input.focus();
    });
    expect(group).toHaveAttribute("data-focus-within", "true");

    act(() => {
      input.blur();
    });
    expect(group).not.toHaveAttribute("data-focus-within");
  });
});
