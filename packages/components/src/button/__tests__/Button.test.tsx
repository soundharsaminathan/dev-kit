import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Button } from "../Button";

describe("Button", () => {
  it("renders with correct role", () => {
    render(<Button>Click me</Button>);
    expect(
      screen.getByRole("button", { name: "Click me" }),
    ).toBeInTheDocument();
  });

  it("applies data-variant attribute", () => {
    render(<Button variant="primary">Primary</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-variant", "primary");
  });

  it("defaults to default variant", () => {
    render(<Button>Default</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-variant", "default");
  });

  it("applies data-size attribute", () => {
    render(<Button size="lg">Large</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-size", "lg");
  });

  it("defaults to md size", () => {
    render(<Button>Default</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-size", "md");
  });

  it("applies data-icon-only when isIconOnly", () => {
    render(
      <Button isIconOnly aria-label="Upload">
        <svg />
      </Button>,
    );
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-icon-only", "true");
  });

  it("applies data-pending and aria-busy when isPending", () => {
    render(<Button isPending>Loading</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-pending", "true");
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("renders as a different element with as prop", () => {
    render(
      <Button as="a" href="https://example.com">
        Link
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Link" });
    expect(link).toBeInTheDocument();
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "https://example.com");
  });

  it("forwards ref correctly", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref test</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("passes additional HTML attributes", () => {
    render(
      <Button type="submit" aria-label="Submit form">
        Submit
      </Button>,
    );
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("type", "submit");
    expect(button).toHaveAttribute("aria-label", "Submit form");
  });

  it("can be disabled", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("can be disabled via isDisabled (React Aria convention)", () => {
    render(<Button isDisabled>Disabled</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("applies data-state when disabled", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toHaveAttribute(
      "data-state",
      "disabled",
    );
  });

  it("has a root class applied", () => {
    render(<Button>Styled</Button>);
    const button = screen.getByRole("button");
    expect(button.className).toBeTruthy();
    expect(button.className).toMatch(/^_root_/);
  });
});
