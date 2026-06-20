import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Link } from "../Link";

const linkState = vi.hoisted(() => ({ isPressed: false }));

vi.mock("@react-aria/link", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@react-aria/link")>();

  return {
    ...actual,
    useLink: (...args: Parameters<typeof actual.useLink>) => {
      const result = actual.useLink(...args);
      return {
        ...result,
        isPressed: linkState.isPressed || result.isPressed,
      };
    },
  };
});

describe("Link", () => {
  afterEach(() => {
    linkState.isPressed = false;
  });

  it("renders with link role", () => {
    render(<Link href="https://example.com">Example</Link>);
    const link = screen.getByRole("link", { name: "Example" });
    expect(link).toHaveAttribute("href", "https://example.com");
  });

  it("applies data-variant", () => {
    render(
      <Link href="#" variant="quiet">
        Quiet
      </Link>,
    );
    expect(screen.getByRole("link")).toHaveAttribute("data-variant", "quiet");
  });

  it("defaults to accent variant", () => {
    render(<Link href="#">Default</Link>);
    expect(screen.getByRole("link")).toHaveAttribute("data-variant", "accent");
  });

  it("marks disabled state", () => {
    render(
      <Link href="#" isDisabled>
        Disabled
      </Link>,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("data-disabled", "true");
    expect(link).toHaveAttribute("aria-disabled", "true");
  });

  it("reflects hover and focus-visible states", () => {
    render(<Link href="#">Interactive</Link>);
    const link = screen.getByRole("link", { name: "Interactive" });

    fireEvent.pointerEnter(link, { pointerType: "mouse" });
    expect(link).toHaveAttribute("data-hovered", "true");

    act(() => {
      link.focus();
    });
    fireEvent.keyDown(link, { key: "Tab" });
    expect(link).toHaveAttribute("data-focus-visible", "true");
  });

  it("reflects pressed state", () => {
    linkState.isPressed = true;

    render(<Link href="#">Pressed</Link>);
    expect(screen.getByRole("link")).toHaveAttribute("data-pressed", "true");
  });

  it("does not reflect interaction states when disabled", () => {
    render(
      <Link href="#" isDisabled>
        Disabled
      </Link>,
    );
    const link = screen.getByRole("link", { name: "Disabled" });

    fireEvent.pointerEnter(link, { pointerType: "mouse" });
    fireEvent.pointerDown(link, { pointerType: "mouse", button: 0 });

    expect(link).not.toHaveAttribute("data-hovered");
    expect(link).not.toHaveAttribute("data-pressed");
  });
});
