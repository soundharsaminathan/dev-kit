import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Group } from "../../group/Group";
import { Input } from "../../input/Input";
import { OTPField, OTPFieldSeparator } from "../OTPField";

function focusInput(input: HTMLElement) {
  act(() => {
    input.focus();
  });
}

function changeInput(input: HTMLElement, value: string) {
  act(() => {
    fireEvent.change(input, { target: { value } });
  });
}

function keyDownInput(input: HTMLElement, key: string) {
  act(() => {
    fireEvent.keyDown(input, { key });
  });
}

function pasteInput(input: HTMLElement, data: string) {
  act(() => {
    fireEvent.paste(input, {
      clipboardData: { getData: () => data },
    });
  });
}

describe("OTPField", () => {
  it("renders default digit inputs for the given length", () => {
    render(<OTPField length={6} aria-label="Verification code" />);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(6);
    expect(inputs[0]).toHaveAttribute("inputmode", "numeric");
    expect(inputs[0]).toHaveAttribute("maxlength", "1");
  });

  it("applies otp field data attributes", () => {
    const { container } = render(
      <OTPField length={4} aria-label="Code" isInvalid />,
    );
    expect(container.querySelector("[data-otp-field='']")).toBeInTheDocument();
    expect(container.querySelector("[data-field='']")).toBeInTheDocument();
    expect(
      container.querySelector("[data-invalid='true']"),
    ).toBeInTheDocument();
  });

  it("labels subsequent digits for accessibility", () => {
    render(<OTPField length={3} aria-label="Verification code" />);
    expect(
      screen.getByRole("textbox", { name: "Digit 2" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Digit 3" }),
    ).toBeInTheDocument();
  });

  it("composes a single value and calls onChange", () => {
    const onChange = vi.fn();
    render(
      <OTPField
        length={4}
        aria-label="Verification code"
        onChange={onChange}
      />,
    );
    const inputs = screen.getAllByRole("textbox");

    changeInput(inputs[0]!, "1");
    expect(onChange).toHaveBeenLastCalledWith("1");

    changeInput(inputs[1]!, "2");
    expect(onChange).toHaveBeenLastCalledWith("12");
  });

  it("advances focus after entering a digit", () => {
    render(<OTPField length={3} aria-label="Verification code" />);
    const inputs = screen.getAllByRole("textbox");

    changeInput(inputs[0]!, "1");
    expect(inputs[1]).toHaveFocus();
  });

  it("moves to the previous cell on backspace when empty", () => {
    render(
      <OTPField length={3} defaultValue="12" aria-label="Verification code" />,
    );
    const inputs = screen.getAllByRole("textbox");

    focusInput(inputs[1]!);
    keyDownInput(inputs[1]!, "Backspace");
    keyDownInput(inputs[1]!, "Backspace");

    expect(inputs[0]).toHaveFocus();
  });

  it("pastes a full code across cells", () => {
    const onChange = vi.fn();
    render(
      <OTPField
        length={6}
        aria-label="Verification code"
        onChange={onChange}
      />,
    );
    const inputs = screen.getAllByRole("textbox");

    pasteInput(inputs[0]!, "123456");

    expect(onChange).toHaveBeenLastCalledWith("123456");
    expect(inputs[5]).toHaveFocus();
  });

  it("renders a hidden input for form submission", () => {
    const { container } = render(
      <OTPField length={4} name="code" defaultValue="12" aria-label="Code" />,
    );
    const hiddenInput = container.querySelector(
      'input[type="hidden"][name="code"]',
    );
    expect(hiddenInput).toHaveValue("12");
  });

  it("renders separators with the expected data attribute", () => {
    const { container } = render(
      <OTPField length={2} aria-label="Code">
        <OTPFieldSeparator>-</OTPFieldSeparator>
      </OTPField>,
    );
    expect(
      container.querySelector("[data-otp-field-separator='']"),
    ).toBeInTheDocument();
  });

  it("clears the current digit on Delete", () => {
    const onChange = vi.fn();
    render(
      <OTPField
        length={3}
        defaultValue="123"
        aria-label="Verification code"
        onChange={onChange}
      />,
    );
    const inputs = screen.getAllByRole("textbox");

    focusInput(inputs[1]!);
    keyDownInput(inputs[1]!, "Delete");

    expect(onChange).toHaveBeenLastCalledWith("13");
  });

  it("clears the current digit on Backspace when the cell has a value", () => {
    const onChange = vi.fn();
    render(
      <OTPField
        length={3}
        defaultValue="12"
        aria-label="Verification code"
        onChange={onChange}
      />,
    );
    const inputs = screen.getAllByRole("textbox");

    focusInput(inputs[0]!);
    keyDownInput(inputs[0]!, "Backspace");

    expect(onChange).toHaveBeenLastCalledWith("2");
    expect(inputs[0]).toHaveFocus();
  });

  it("navigates between cells with arrow keys", () => {
    render(
      <OTPField length={3} defaultValue="123" aria-label="Verification code" />,
    );
    const inputs = screen.getAllByRole("textbox");

    focusInput(inputs[1]!);
    keyDownInput(inputs[1]!, "ArrowLeft");
    expect(inputs[0]).toHaveFocus();

    keyDownInput(inputs[0]!, "ArrowRight");
    expect(inputs[1]).toHaveFocus();
  });

  it("ignores input when disabled", () => {
    const onChange = vi.fn();
    render(
      <OTPField
        length={3}
        isDisabled
        aria-label="Verification code"
        onChange={onChange}
      />,
    );
    const input = screen.getAllByRole("textbox")[0]!;

    changeInput(input, "1");
    keyDownInput(input, "Backspace");
    pasteInput(input, "123");

    expect(onChange).not.toHaveBeenCalled();
  });

  it("ignores input when read only", () => {
    const onChange = vi.fn();
    render(
      <OTPField
        length={3}
        isReadOnly
        aria-label="Verification code"
        onChange={onChange}
      />,
    );

    changeInput(screen.getAllByRole("textbox")[0]!, "1");

    expect(onChange).not.toHaveBeenCalled();
  });

  it("ignores paste when clipboard content has no digits", () => {
    const onChange = vi.fn();
    render(
      <OTPField
        length={4}
        aria-label="Verification code"
        onChange={onChange}
      />,
    );

    pasteInput(screen.getAllByRole("textbox")[0]!, "----");

    expect(onChange).not.toHaveBeenCalled();
  });

  it("truncates pasted values at the field length", () => {
    const onChange = vi.fn();
    render(
      <OTPField
        length={4}
        aria-label="Verification code"
        onChange={onChange}
      />,
    );
    const inputs = screen.getAllByRole("textbox");

    pasteInput(inputs[2]!, "345678");

    expect(onChange).toHaveBeenLastCalledWith("34");
    expect(inputs[3]).toHaveFocus();
  });

  it("respects defaultPrevented change handlers", () => {
    const onChange = vi.fn();
    render(
      <OTPField length={2} aria-label="Verification code" onChange={onChange}>
        <Group>
          <Input
            onChange={(event) => {
              event.preventDefault();
            }}
          />
          <Input />
        </Group>
      </OTPField>,
    );

    changeInput(screen.getAllByRole("textbox")[0]!, "1");

    expect(onChange).not.toHaveBeenCalled();
  });

  it("selects the cell value on focus", () => {
    const selectSpy = vi.spyOn(HTMLInputElement.prototype, "select");

    render(
      <OTPField length={2} defaultValue="12" aria-label="Verification code" />,
    );
    const inputs = screen.getAllByRole("textbox");

    act(() => {
      inputs[0]?.focus();
      fireEvent.focus(inputs[0]!);
    });

    expect(selectSpy).toHaveBeenCalled();
    selectSpy.mockRestore();
  });

  it("marks only the first cell as required", () => {
    render(<OTPField length={3} isRequired aria-label="Verification code" />);
    const inputs = screen.getAllByRole("textbox");

    expect(inputs[0]).toBeRequired();
    expect(inputs[1]).not.toBeRequired();
    expect(inputs[2]).not.toBeRequired();
  });

  it("strips non-digit characters from input changes", () => {
    const onChange = vi.fn();
    render(
      <OTPField
        length={3}
        aria-label="Verification code"
        onChange={onChange}
      />,
    );

    changeInput(screen.getAllByRole("textbox")[0]!, "a1b");

    expect(onChange).toHaveBeenLastCalledWith("1");
  });
});
