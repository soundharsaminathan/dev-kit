import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../../button/Button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarList,
  SidebarProvider,
  SidebarSection,
  SidebarSectionHeading,
  SidebarTooltip,
  useSidebarContext,
} from "../Sidebar";

function ToggleButton() {
  const { toggleSidebar } = useSidebarContext("ToggleButton");
  return (
    <Button aria-label="Toggle sidebar" onClick={toggleSidebar}>
      Toggle
    </Button>
  );
}

describe("Sidebar", () => {
  it("renders sidebar structure", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>Header</SidebarHeader>
          <SidebarContent>
            <SidebarList>
              <SidebarItem>Item</SidebarItem>
            </SidebarList>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    expect(document.querySelector("[data-sidebar='']")).toBeInTheDocument();
    expect(document.querySelector("[data-sidebar-wrapper='']")).toHaveStyle({
      "--sidebar-width": "15rem",
      "--sidebar-width-icon": "3rem",
    });
  });

  it("toggles expanded state", () => {
    render(
      <SidebarProvider defaultOpen>
        <Sidebar>
          <SidebarContent>Content</SidebarContent>
        </Sidebar>
        <ToggleButton />
      </SidebarProvider>,
    );

    const sidebar = document.querySelector("[data-sidebar='']");
    expect(sidebar).toHaveAttribute("data-expanded", "true");

    fireEvent.click(screen.getByRole("button", { name: "Toggle sidebar" }));

    expect(sidebar).not.toHaveAttribute("data-expanded");
  });

  it("keeps tooltip items inside the list", () => {
    render(
      <SidebarProvider defaultOpen>
        <Sidebar>
          <SidebarContent>
            <SidebarList>
              <SidebarItem tooltip="Home">
                <Button variant="quiet">Home</Button>
              </SidebarItem>
            </SidebarList>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const list = document.querySelector("[data-sidebar-list]");
    const item = document.querySelector("[data-sidebar-item]");

    expect(list?.contains(item)).toBe(true);
    expect(item?.parentElement?.tagName).toBe("UL");
  });

  it("supports keyboard shortcut", () => {
    render(
      <SidebarProvider defaultOpen>
        <Sidebar>
          <SidebarContent>Content</SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const sidebar = document.querySelector("[data-sidebar='']");
    expect(sidebar).toHaveAttribute("data-expanded", "true");

    fireEvent.keyDown(window, { key: "b", metaKey: true });

    expect(sidebar).not.toHaveAttribute("data-expanded");
  });

  it("throws when useSidebarContext is used outside provider", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<ToggleButton />)).toThrow(
      "ToggleButton must be used within SidebarProvider",
    );

    consoleError.mockRestore();
  });

  it("supports controlled open state", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <SidebarProvider isOpen={false} onOpenChange={onOpenChange}>
        <Sidebar>
          <SidebarContent>Content</SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const sidebar = document.querySelector("[data-sidebar='']");
    expect(sidebar).not.toHaveAttribute("data-expanded");

    rerender(
      <SidebarProvider isOpen onOpenChange={onOpenChange}>
        <Sidebar>
          <SidebarContent>Content</SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    expect(document.querySelector("[data-sidebar='']")).toHaveAttribute(
      "data-expanded",
      "true",
    );
  });

  it("renders section, footer, placement, and tooltip helpers", () => {
    render(
      <SidebarProvider defaultOpen={false}>
        <Sidebar placement="right">
          <SidebarHeader>Header</SidebarHeader>
          <SidebarContent>
            <SidebarSection>
              <SidebarSectionHeading>Navigation</SidebarSectionHeading>
              <SidebarList>
                <SidebarItem>
                  <Button variant="quiet">Home</Button>
                </SidebarItem>
              </SidebarList>
            </SidebarSection>
            <SidebarTooltip content="Settings">
              <Button variant="quiet">Settings</Button>
            </SidebarTooltip>
          </SidebarContent>
          <SidebarFooter>Footer</SidebarFooter>
        </Sidebar>
      </SidebarProvider>,
    );

    expect(document.querySelector("[data-sidebar='']")).toHaveAttribute(
      "data-placement",
      "right",
    );
    expect(
      document.querySelector("[data-sidebar-section='']"),
    ).toBeInTheDocument();
    expect(
      document.querySelector("[data-sidebar-section-heading='']"),
    ).toHaveTextContent("Navigation");
    expect(
      document.querySelector("[data-sidebar-footer='']"),
    ).toHaveTextContent("Footer");
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });
});
