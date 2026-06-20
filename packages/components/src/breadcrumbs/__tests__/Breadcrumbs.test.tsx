import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  Breadcrumbs,
} from "../Breadcrumbs";

const collectionItems = [
  { id: "home", label: "Home", href: "#" },
  { id: "docs", label: "Docs", href: "#" },
  { id: "current", label: "Current" },
];

describe("Breadcrumbs", () => {
  it("renders manual compound children", () => {
    render(
      <Breadcrumbs>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Home</BreadcrumbLink>
          <BreadcrumbSeparator />
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Components</BreadcrumbLink>
          <BreadcrumbSeparator />
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink>Breadcrumbs</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumbs>,
    );

    const list = screen.getByRole("list", { name: "Breadcrumbs" });
    expect(list).toHaveAttribute("data-breadcrumbs", "");
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "#",
    );
    expect(screen.getByText("Breadcrumbs")).toHaveAttribute(
      "data-current",
      "true",
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("renders a collection from items", () => {
    render(<Breadcrumbs items={collectionItems} />);

    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByText("Current")).toHaveAttribute("data-current", "true");
    expect(
      document.querySelectorAll("[data-breadcrumb-separator]"),
    ).toHaveLength(2);
  });

  it("marks disabled links", () => {
    render(
      <Breadcrumbs>
        <BreadcrumbItem>
          <BreadcrumbLink href="#" isDisabled>
            Home
          </BreadcrumbLink>
          <BreadcrumbSeparator data-testid="breadcrumb-separator" />
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink>Current</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumbs>,
    );

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "data-disabled",
      "true",
    );
  });

  it("marks all links disabled when the group is disabled", () => {
    render(
      <Breadcrumbs isDisabled>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Home</BreadcrumbLink>
          <BreadcrumbSeparator />
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink>Current</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumbs>,
    );

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "data-disabled",
      "true",
    );
    expect(screen.getByText("Current")).toHaveAttribute(
      "data-disabled",
      "true",
    );
  });

  it("marks collection items as disabled", () => {
    render(
      <Breadcrumbs
        items={[
          { id: "home", label: "Home", href: "#", isDisabled: true },
          { id: "current", label: "Current" },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "data-disabled",
      "true",
    );
  });

  it("calls onAction when a breadcrumb link is activated", () => {
    const onAction = vi.fn();

    render(
      <Breadcrumbs onAction={onAction}>
        <BreadcrumbItem id="home">
          <BreadcrumbLink href="#">Home</BreadcrumbLink>
          <BreadcrumbSeparator />
        </BreadcrumbItem>
        <BreadcrumbItem id="current">
          <BreadcrumbLink>Current</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumbs>,
    );

    fireEvent.click(screen.getByRole("link", { name: "Home" }));

    expect(onAction).toHaveBeenCalledWith("home");
  });

  it("renders collection items with a custom render function", () => {
    render(
      <Breadcrumbs items={collectionItems}>
        {(item) => (
          <BreadcrumbItem id={`custom-${String(item.id)}`}>
            <BreadcrumbLink
              {...(item.href !== undefined ? { href: item.href } : {})}
            >
              {item.label}
            </BreadcrumbLink>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
          </BreadcrumbItem>
        )}
      </Breadcrumbs>,
    );

    expect(screen.getAllByText("/")).toHaveLength(2);
    expect(screen.getByText("Current")).toHaveAttribute("data-current", "true");
  });

  it("returns non-element nodes from a custom render function", () => {
    render(
      <Breadcrumbs items={[{ id: "plain", label: "Plain" }]}>
        {() => "Plain text crumb"}
      </Breadcrumbs>,
    );

    expect(screen.getByText("Plain text crumb")).toBeInTheDocument();
  });

  it("renders nothing when children is a function without items", () => {
    render(<Breadcrumbs>{() => null}</Breadcrumbs>);

    expect(
      screen.getByRole("list", { name: "Breadcrumbs" }),
    ).toBeEmptyDOMElement();
  });

  it("passes through non-item children in manual composition", () => {
    render(
      <Breadcrumbs>
        <span data-testid="prefix">Prefix</span>
        orphan crumb
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Home</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumbs>,
    );

    expect(screen.getByTestId("prefix")).toHaveTextContent("Prefix");
    expect(screen.getByText("orphan crumb")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
  });

  it("renders a custom separator", () => {
    render(
      <Breadcrumbs>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Home</BreadcrumbLink>
          <BreadcrumbSeparator>/</BreadcrumbSeparator>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink>Current</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumbs>,
    );

    expect(screen.getByText("/")).toHaveAttribute(
      "data-breadcrumb-separator",
      "",
    );
  });

  it("renders the default chevron separator icon", () => {
    render(
      <Breadcrumbs>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Home</BreadcrumbLink>
          <BreadcrumbSeparator />
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink>Current</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumbs>,
    );

    const separator = document.querySelector("[data-breadcrumb-separator]");
    expect(separator?.querySelector("svg")).toBeInTheDocument();
  });

  it("reflects hover state on links", () => {
    render(
      <Breadcrumbs>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Home</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumbs>,
    );

    const link = screen.getByRole("link", { name: "Home" });

    fireEvent.pointerEnter(link, { pointerType: "mouse" });
    expect(link).toHaveAttribute("data-hovered", "true");
  });

  it("reflects focus-visible state on keyboard focus", () => {
    render(
      <Breadcrumbs>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Home</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumbs>,
    );

    const link = screen.getByRole("link", { name: "Home" });

    act(() => {
      link.focus();
    });
    fireEvent.keyDown(link, { key: "Tab" });
    expect(link).toHaveAttribute("data-focus-visible", "true");
  });

  it("does not reflect interaction states when disabled", () => {
    render(
      <Breadcrumbs>
        <BreadcrumbItem>
          <BreadcrumbLink href="#" isDisabled>
            Home
          </BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumbs>,
    );

    const link = screen.getByRole("link", { name: "Home" });

    fireEvent.pointerEnter(link, { pointerType: "mouse" });
    fireEvent.pointerDown(link, { pointerType: "mouse", button: 0 });

    expect(link).not.toHaveAttribute("data-hovered");
    expect(link).not.toHaveAttribute("data-pressed");
  });

  it("throws when BreadcrumbItem is used outside Breadcrumbs", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() =>
      render(
        <BreadcrumbItem>
          <span>Item</span>
        </BreadcrumbItem>,
      ),
    ).toThrow("BreadcrumbItem must be used within Breadcrumbs");

    consoleError.mockRestore();
  });

  it("throws when BreadcrumbLink is used outside BreadcrumbItem", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() =>
      render(<BreadcrumbLink href="#">Home</BreadcrumbLink>),
    ).toThrow("BreadcrumbLink must be used within BreadcrumbItem");

    consoleError.mockRestore();
  });
});
