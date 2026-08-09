import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Tab, TabList, TabPanel, Tabs } from "../Tabs";

function renderTabs(
  props: Partial<React.ComponentProps<typeof Tabs>> = {},
  tabListProps: Partial<React.ComponentProps<typeof TabList>> = {},
) {
  return render(
    <Tabs defaultSelectedKey="one" aria-label="Settings" {...props}>
      <TabList {...tabListProps}>
        <Tab id="one">One</Tab>
        <Tab id="two">Two</Tab>
        <Tab id="three" isDisabled>
          Three
        </Tab>
      </TabList>
      <TabPanel id="one">Panel one</TabPanel>
      <TabPanel id="two">Panel two</TabPanel>
      <TabPanel id="three">Panel three</TabPanel>
    </Tabs>,
  );
}

describe("Tabs", () => {
  it("renders tabs and panels", () => {
    renderTabs();

    expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Panel one")).toBeVisible();
    expect(document.querySelector("[data-tabs='']")).toHaveAttribute(
      "data-orientation",
      "horizontal",
    );

    fireEvent.keyDown(screen.getByRole("tab", { name: "One" }), {
      key: "ArrowRight",
    });
    expect(screen.getByRole("tab", { name: "Two" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("selects tabs on click and shows the selection indicator", () => {
    renderTabs();

    fireEvent.click(screen.getByRole("tab", { name: "Two" }));

    expect(screen.getByRole("tab", { name: "Two" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Panel two")).toBeVisible();
    expect(
      screen
        .getByRole("tab", { name: "Two" })
        .querySelector("[data-tab-indicator='']"),
    ).toBeInTheDocument();
  });

  it("marks inactive panels as inert", () => {
    renderTabs();

    expect(
      screen.getByText("Panel two").closest("[data-tab-panel='']"),
    ).toHaveAttribute("data-inert", "true");
    expect(
      screen.getByText("Panel one").closest("[data-tab-panel='']"),
    ).not.toHaveAttribute("data-inert");
  });

  it("supports vertical orientation and line variant", () => {
    renderTabs({ orientation: "vertical" }, { variant: "line" });

    expect(document.querySelector("[data-tabs='']")).toHaveAttribute(
      "data-orientation",
      "vertical",
    );
    expect(document.querySelector("[data-tab-list='']")).toHaveAttribute(
      "data-variant",
      "line",
    );
    expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute(
      "data-variant",
      "line",
    );
  });

  it("marks disabled tabs", () => {
    renderTabs({ isDisabled: true });

    expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute(
      "data-disabled",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Three" })).toHaveAttribute(
      "data-disabled",
      "true",
    );
  });

  it("forwards data-testid onto tabs", () => {
    render(
      <Tabs defaultSelectedKey="one" aria-label="Settings">
        <TabList>
          <Tab id="one" data-testid="tab-one">
            One
          </Tab>
          <Tab id="two" data-testid="tab-two">
            Two
          </Tab>
        </TabList>
        <TabPanel id="one">Panel one</TabPanel>
        <TabPanel id="two">Panel two</TabPanel>
      </Tabs>,
    );

    expect(screen.getByTestId("tab-one")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByTestId("tab-two")).toBeInTheDocument();
  });

  it("reflects hover and focus-visible states on tabs", () => {
    renderTabs();
    const tab = screen.getByRole("tab", { name: "One" });

    fireEvent.pointerEnter(tab, { pointerType: "mouse" });
    expect(tab).toHaveAttribute("data-hovered", "true");

    act(() => {
      tab.focus();
    });
    fireEvent.keyDown(tab, { key: "Tab" });
    expect(tab).toHaveAttribute("data-focus-visible", "true");
  });

  it("does not reflect hover on disabled tabs", () => {
    renderTabs();
    const tab = screen.getByRole("tab", { name: "Three" });

    fireEvent.pointerEnter(tab, { pointerType: "mouse" });

    expect(tab).not.toHaveAttribute("data-hovered");
  });

  it("renders when TabList is missing", () => {
    render(
      <Tabs defaultSelectedKey="solo" aria-label="Empty tabs">
        <TabPanel id="solo">Only panel</TabPanel>
      </Tabs>,
    );

    expect(document.querySelector("[data-tabs='']")).toBeInTheDocument();
    expect(screen.getByText("Only panel")).toBeInTheDocument();
  });

  it("throws when Tab is used outside Tabs", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<Tab id="one">One</Tab>)).toThrow(
      "Tab must be used within Tabs",
    );

    consoleError.mockRestore();
  });

  it("throws when TabList is used outside Tabs", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() =>
      render(
        <TabList>
          <Tab id="one">One</Tab>
        </TabList>,
      ),
    ).toThrow("TabList must be used within Tabs");

    consoleError.mockRestore();
  });

  it("throws when Tab is used outside TabList", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() =>
      render(
        <Tabs defaultSelectedKey="one" aria-label="Settings">
          <Tab id="one">One</Tab>
        </Tabs>,
      ),
    ).toThrow("Tab must be used within TabList");

    consoleError.mockRestore();
  });

  it("throws when TabPanel is used outside Tabs", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<TabPanel id="one">Panel one</TabPanel>)).toThrow(
      "TabPanel must be used within Tabs",
    );

    consoleError.mockRestore();
  });
});
