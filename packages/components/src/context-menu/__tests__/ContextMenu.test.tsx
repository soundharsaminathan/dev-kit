import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  MenuContent,
  MenuItem,
  MenuItemDescription,
  MenuItemLabel,
} from "../../menu/Menu";
import { ContextMenu } from "../ContextMenu";
import { CONTEXT_MENU_OPEN_EVENT } from "../use-context-menu-trigger";

function renderContextMenu({
  defaultOpen = false,
  isDisabled = false,
}: {
  defaultOpen?: boolean;
  isDisabled?: boolean;
} = {}) {
  render(
    <ContextMenu
      aria-label="Actions"
      defaultOpen={defaultOpen}
      isDisabled={isDisabled}
    >
      <span>Right click me</span>
      <MenuContent>
        <MenuItem id="edit">Edit</MenuItem>
        <MenuItem id="delete" variant="danger">
          Delete
        </MenuItem>
      </MenuContent>
    </ContextMenu>,
  );

  return document.querySelector<HTMLElement>("[data-context-menu]");
}

describe("ContextMenu", () => {
  it("renders trigger and menu structure", () => {
    renderContextMenu();

    expect(document.querySelector("[data-context-menu]")).toBeInTheDocument();
    expect(screen.getByText("Right click me")).toBeInTheDocument();
  });

  it("marks disabled triggers", () => {
    renderContextMenu({ isDisabled: true });

    expect(document.querySelector("[data-context-menu]")).toHaveAttribute(
      "data-disabled",
      "",
    );
  });

  it("opens on right click", () => {
    const trigger = renderContextMenu();
    expect(trigger).toBeTruthy();

    fireEvent.contextMenu(trigger!, { clientX: 120, clientY: 80 });

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
  });

  it("opens via the context menu open event", () => {
    const trigger = renderContextMenu();
    expect(trigger).toBeTruthy();

    act(() => {
      trigger!.dispatchEvent(
        new CustomEvent(CONTEXT_MENU_OPEN_EVENT, {
          bubbles: false,
          detail: { x: 120, y: 80 },
        }),
      );
    });

    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("renders open menu content with defaultOpen", () => {
    renderContextMenu({ defaultOpen: true });

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveAttribute(
      "data-variant",
      "danger",
    );
  });

  it("closes when a menu item is selected", () => {
    const trigger = renderContextMenu();

    fireEvent.contextMenu(trigger!, { clientX: 120, clientY: 80 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("renders custom menu item content", () => {
    render(
      <ContextMenu aria-label="Actions" defaultOpen>
        <span>Right click me</span>
        <MenuContent>
          <MenuItem id="share">
            <MenuItemLabel>Share</MenuItemLabel>
            <MenuItemDescription>Send a copy</MenuItemDescription>
          </MenuItem>
        </MenuContent>
      </ContextMenu>,
    );

    expect(screen.getByText("Share")).toHaveAttribute(
      "data-menu-item-label",
      "",
    );
    expect(screen.getByText("Send a copy")).toHaveAttribute(
      "data-menu-item-description",
      "",
    );
  });

  it("renders non-element children alongside trigger content", () => {
    render(
      <ContextMenu aria-label="Actions">
        Plain text
        <span>Right click me</span>
        <MenuContent>
          <MenuItem id="edit">Edit</MenuItem>
        </MenuContent>
      </ContextMenu>,
    );

    expect(screen.getByText("Plain text")).toBeInTheDocument();
    expect(screen.getByText("Right click me")).toBeInTheDocument();
  });

  it("renders without menu content", () => {
    render(
      <ContextMenu aria-label="Actions">
        <span>Right click me</span>
      </ContextMenu>,
    );

    const trigger = document.querySelector("[data-context-menu]");
    expect(trigger).toBeInTheDocument();
    fireEvent.contextMenu(trigger!, { clientX: 10, clientY: 10 });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
