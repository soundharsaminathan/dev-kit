import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Text } from "../../text/Text";
import { Skeleton } from "../Skeleton";

describe("Skeleton", () => {
  it("renders placeholder when empty", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveAttribute(
      "data-skeleton-loading",
      "true",
    );
  });

  it("wraps children when loading", () => {
    render(
      <Skeleton isLoading>
        <Text>Content</Text>
      </Skeleton>,
    );
    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(screen.getByText("Content").parentElement).toHaveAttribute(
      "data-skeleton-loading",
      "true",
    );
  });

  it("does not load when isLoading is false", () => {
    render(
      <Skeleton isLoading={false}>
        <Text>Ready</Text>
      </Skeleton>,
    );
    expect(screen.getByText("Ready").parentElement).not.toHaveAttribute(
      "data-skeleton-loading",
    );
  });

  it("returns null when not loading and there are no children", () => {
    const { container } = render(<Skeleton isLoading={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("applies animation when loading", () => {
    const { container } = render(<Skeleton animation="pulse" />);
    expect(container.firstChild).toHaveAttribute("data-animation", "pulse");
  });

  it("sets busy and inert attributes while loading", () => {
    const { container } = render(<Skeleton />);
    const skeleton = container.firstChild as HTMLElement;

    expect(skeleton).toHaveAttribute("aria-busy", "true");
    expect(skeleton).toHaveAttribute("inert");
  });
});
