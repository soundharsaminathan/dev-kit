import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "../../button/Button";
import { Toolbar } from "../index";

describe("Toolbar", () => {
  it("renders with toolbar role", () => {
    render(
      <Toolbar aria-label="Formatting">
        <Button>Bold</Button>
        <Button>Italic</Button>
      </Toolbar>,
    );

    expect(screen.getByRole("toolbar")).toBeInTheDocument();
  });

  it("renders with data-toolbar attribute", () => {
    const { container } = render(
      <Toolbar aria-label="Formatting">
        <Button>Bold</Button>
      </Toolbar>,
    );

    expect(container.querySelector("[data-toolbar='']")).toBeInTheDocument();
  });
});
