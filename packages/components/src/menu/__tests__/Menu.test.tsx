import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../../button/Button";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuItemDescription,
  MenuItemLabel,
  MenuSection,
} from "../Menu";

function renderActionsMenu({
  defaultOpen = false,
  menuContentProps = {},
}: {
  defaultOpen?: boolean;
  menuContentProps?: Record<string, unknown>;
} = {}) {
  render(
    <Menu defaultOpen={defaultOpen}>
      <Button aria-label="Actions">Open</Button>
      <MenuContent {...menuContentProps}>
        <MenuItem id="edit">Edit</MenuItem>
        <MenuItem id="duplicate">Duplicate</MenuItem>
        <MenuItem id="delete" isDisabled>
          Delete
        </MenuItem>
      </MenuContent>
    </Menu>,
  );
}

describe("Menu", () => {
  it("renders menu trigger", () => {
    renderActionsMenu();
    expect(screen.getByRole("button", { name: "Actions" })).toBeInTheDocument();
  });

  it("opens the menu when the trigger is clicked", () => {
    renderActionsMenu();

    fireEvent.click(screen.getByRole("button", { name: "Actions" }));

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Duplicate" }),
    ).toBeInTheDocument();
  });

  it("closes the menu when an item is selected", () => {
    renderActionsMenu();

    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes the menu on Escape", () => {
    renderActionsMenu({ defaultOpen: true });

    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("shows a selected indicator in single selection mode", () => {
    render(
      <Menu defaultOpen>
        <Button aria-label="Actions">Open</Button>
        <MenuContent selectionMode="single" defaultSelectedKeys={["edit"]}>
          <MenuItem id="edit">Edit</MenuItem>
          <MenuItem id="duplicate">Duplicate</MenuItem>
        </MenuContent>
      </Menu>,
    );

    const editItem = screen.getByRole("menuitemradio", { name: "Edit" });
    expect(editItem).toHaveAttribute("data-selected", "true");
    expect(
      editItem.querySelector("[data-menu-item-indicator]"),
    ).toBeInTheDocument();
  });

  it("marks disabled menu items", () => {
    renderActionsMenu({ defaultOpen: true });

    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveAttribute(
      "data-disabled",
      "true",
    );
  });

  it("renders danger variant items", () => {
    render(
      <Menu defaultOpen>
        <Button aria-label="Actions">Open</Button>
        <MenuContent>
          <MenuItem id="remove" variant="danger">
            Remove
          </MenuItem>
        </MenuContent>
      </Menu>,
    );

    expect(screen.getByRole("menuitem", { name: "Remove" })).toHaveAttribute(
      "data-variant",
      "danger",
    );
  });

  it("renders custom item label and description", () => {
    render(
      <Menu defaultOpen>
        <Button aria-label="Actions">Open</Button>
        <MenuContent>
          <MenuItem id="share">
            <MenuItemLabel>Share</MenuItemLabel>
            <MenuItemDescription>Send a copy to teammates</MenuItemDescription>
          </MenuItem>
        </MenuContent>
      </Menu>,
    );

    expect(screen.getByText("Share")).toHaveAttribute(
      "data-menu-item-label",
      "",
    );
    expect(screen.getByText("Send a copy to teammates")).toHaveAttribute(
      "data-menu-item-description",
      "",
    );
  });

  it("throws when MenuContent is rendered outside Menu", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() =>
      render(
        <MenuContent>
          <MenuItem id="edit">Edit</MenuItem>
        </MenuContent>,
      ),
    ).toThrow("MenuContent must be used within Menu");

    consoleError.mockRestore();
  });

  it("renders menu section headers", () => {
    render(
      <ul>
        <MenuSection title="Actions" />
      </ul>,
    );

    expect(screen.getByText("Actions")).toHaveAttribute(
      "data-menu-section-header",
      "",
    );
    expect(
      screen.getByText("Actions").closest("[data-menu-section]"),
    ).toBeInTheDocument();
  });

  it("supports multiple selection mode", () => {
    render(
      <Menu defaultOpen>
        <Button aria-label="Actions">Open</Button>
        <MenuContent selectionMode="multiple" defaultSelectedKeys={["edit"]}>
          <MenuItem id="edit">Edit</MenuItem>
          <MenuItem id="duplicate">Duplicate</MenuItem>
        </MenuContent>
      </Menu>,
    );

    const editItem = screen.getByRole("menuitemcheckbox", { name: "Edit" });
    expect(editItem).toHaveAttribute("data-selected", "true");
    expect(editItem).toHaveAttribute("data-selection-mode", "multiple");
  });

  it("renders string menu items with labels", () => {
    render(
      <Menu defaultOpen>
        <Button aria-label="Actions">Open</Button>
        <MenuContent>
          <MenuItem id="share">Share</MenuItem>
        </MenuContent>
      </Menu>,
    );

    expect(screen.getByText("Share")).toHaveAttribute(
      "data-menu-item-label",
      "",
    );
  });

  it("renders a menu without content children", () => {
    render(
      <Menu>
        <Button aria-label="Actions">Open</Button>
      </Menu>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("renders menu sections without headers", () => {
    render(
      <Menu defaultOpen>
        <Button aria-label="Actions">Open</Button>
        <MenuContent>
          <MenuSection>
            <MenuItem id="edit">Edit</MenuItem>
          </MenuSection>
        </MenuContent>
      </Menu>,
    );

    expect(
      document.querySelector("[data-menu-section-header='']"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
  });

  it("reflects hover and focus states on menu items", () => {
    renderActionsMenu({ defaultOpen: true });

    const editItem = screen.getByRole("menuitem", { name: "Edit" });
    fireEvent.pointerEnter(editItem, { pointerType: "mouse" });
    expect(editItem).toHaveAttribute("data-hovered", "true");

    act(() => {
      editItem.focus();
    });
    fireEvent.keyDown(editItem, { key: "Tab" });
    expect(editItem).toHaveAttribute("data-focus-visible", "true");
  });
});
