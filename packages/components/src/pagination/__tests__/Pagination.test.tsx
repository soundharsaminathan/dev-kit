import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Pagination,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationList,
  PaginationNext,
  PaginationPrevious,
} from "../Pagination";

describe("Pagination", () => {
  it("renders navigation with aria-label and data attribute", () => {
    render(
      <Pagination>
        <PaginationList>
          <PaginationItem>
            <PaginationLink>1</PaginationLink>
          </PaginationItem>
        </PaginationList>
      </Pagination>,
    );

    const nav = screen.getByRole("navigation", { name: "pagination" });
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveAttribute("data-pagination", "");
  });

  it("renders list and item elements", () => {
    const { container } = render(
      <Pagination>
        <PaginationList data-testid="pagination-list">
          <PaginationItem data-testid="pagination-item">
            <PaginationLink>1</PaginationLink>
          </PaginationItem>
        </PaginationList>
      </Pagination>,
    );

    expect(container.querySelector("ul")).toBeInTheDocument();
    expect(container.querySelector("li")).toBeInTheDocument();
  });

  it("renders link buttons with link variant", () => {
    render(<PaginationLink>2</PaginationLink>);
    const link = screen.getByRole("button", { name: "2" });
    expect(link).toHaveAttribute("data-variant", "link");
  });

  it("sets aria-current when link is active", () => {
    render(<PaginationLink isActive>3</PaginationLink>);
    const link = screen.getByRole("button", { name: "3" });
    expect(link).toHaveAttribute("aria-current", "page");
    expect(link).toHaveAttribute("data-active", "true");
  });

  it("renders previous control with accessible name", () => {
    render(<PaginationPrevious />);
    expect(
      screen.getByRole("button", { name: "Go to previous page" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Previous")).toBeInTheDocument();
  });

  it("renders next control with accessible name", () => {
    render(<PaginationNext />);
    expect(
      screen.getByRole("button", { name: "Go to next page" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
  });

  it("renders ellipsis as aria-hidden", () => {
    const { container } = render(<PaginationEllipsis />);
    const ellipsis = container.querySelector("span");
    expect(ellipsis).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("More pages")).toBeInTheDocument();
  });

  it("supports compound component API", () => {
    render(
      <Pagination>
        <Pagination.List>
          <Pagination.Item>
            <Pagination.Link isActive>1</Pagination.Link>
          </Pagination.Item>
          <Pagination.Item>
            <Pagination.Ellipsis />
          </Pagination.Item>
          <Pagination.Item>
            <Pagination.Next />
          </Pagination.Item>
        </Pagination.List>
      </Pagination>,
    );

    expect(screen.getByRole("button", { name: "1" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("button", { name: "Go to next page" }),
    ).toBeInTheDocument();
  });
});
