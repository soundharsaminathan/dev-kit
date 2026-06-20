import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Group, GroupText } from "../Group";

describe("Group", () => {
  it("renders a group", () => {
    render(
      <Group aria-label="Actions" data-testid="group">
        <button type="button">One</button>
      </Group>,
    );
    expect(screen.getByTestId("group")).toBeInTheDocument();
  });

  it("renders group text", () => {
    render(<GroupText>Prefix</GroupText>);
    expect(screen.getByText("Prefix")).toBeInTheDocument();
  });

  it("applies orientation and state attributes", () => {
    render(
      <Group
        aria-label="Actions"
        data-testid="group"
        orientation="vertical"
        isDisabled
        isInvalid
      >
        <button type="button">One</button>
      </Group>,
    );

    const group = screen.getByTestId("group");
    expect(group).toHaveAttribute("data-orientation", "vertical");
    expect(group).toHaveAttribute("data-disabled", "true");
    expect(group).toHaveAttribute("data-invalid", "true");
  });

  it("reflects hover and focus-within states", () => {
    render(
      <Group aria-label="Actions" data-testid="group">
        <button type="button">One</button>
      </Group>,
    );

    const group = screen.getByTestId("group");
    const button = screen.getByRole("button", { name: "One" });

    fireEvent.pointerEnter(group, { pointerType: "mouse" });
    expect(group).toHaveAttribute("data-hovered", "true");

    act(() => {
      button.focus();
    });
    expect(group).toHaveAttribute("data-focus-within", "true");
  });
});
