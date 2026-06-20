import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { FC, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "../Table";

const users = [
  { id: "1", name: "Alice", email: "alice@example.com", role: "Admin" },
  { id: "2", name: "Bob", email: "bob@example.com", role: "Editor" },
];

type User = (typeof users)[number];

function renderUsersTable(
  props: Partial<
    React.ComponentProps<typeof Table<(typeof users)[number]>>
  > = {},
) {
  return render(
    <Table aria-label="Users" items={users} {...props}>
      <TableHeader>
        <TableColumn id="name" allowsSorting textValue="Name">
          Name
        </TableColumn>
        <TableColumn id="email" isRowHeader>
          Email
        </TableColumn>
        <TableColumn id="role">Role</TableColumn>
      </TableHeader>
      <TableBody>
        {(item: User) => (
          <TableRow>
            {(column) =>
              column.id === "role" ? (
                <span>{item.role}</span>
              ) : (
                <TableCell>{item[column.id as keyof User]}</TableCell>
              )
            }
          </TableRow>
        )}
      </TableBody>
    </Table>,
  );
}

describe("Table", () => {
  it("renders a data table from declarative columns and body render props", () => {
    renderUsersTable();

    expect(screen.getByRole("grid", { name: "Users" })).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Name" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Email" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("bob@example.com")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(
      document.querySelector("[data-table-wrapper='']"),
    ).toBeInTheDocument();
  });

  it("marks sortable columns with aria-sort when sorted ascending", () => {
    renderUsersTable({
      sortDescriptor: { column: "name", direction: "ascending" },
    });

    const nameHeader = screen.getByRole("columnheader", { name: "Name" });
    expect(nameHeader).toHaveAttribute("aria-sort", "ascending");
    expect(nameHeader).toHaveAttribute("data-allows-sorting", "true");
    expect(nameHeader).toHaveAttribute("data-sort-direction", "ascending");
    expect(
      nameHeader.querySelector("svg[data-direction='ascending']"),
    ).toBeInTheDocument();
  });

  it("renders a descending sort indicator", () => {
    renderUsersTable({
      sortDescriptor: { column: "name", direction: "descending" },
    });

    const nameHeader = screen.getByRole("columnheader", { name: "Name" });
    expect(nameHeader).toHaveAttribute("aria-sort", "descending");
    expect(nameHeader).toHaveAttribute("data-sort-direction", "descending");
    expect(
      nameHeader.querySelector("svg[data-direction='descending']"),
    ).toBeInTheDocument();
  });

  it("updates sorting when a sortable header is clicked", () => {
    renderUsersTable();

    fireEvent.click(screen.getByRole("columnheader", { name: "Name" }));

    expect(screen.getByRole("columnheader", { name: "Name" })).toHaveAttribute(
      "aria-sort",
    );
  });

  it("reflects hover and focus-visible states on sortable headers", () => {
    renderUsersTable();
    const header = screen.getByRole("columnheader", { name: "Name" });

    fireEvent.pointerEnter(header, { pointerType: "mouse" });
    expect(header).toHaveAttribute("data-hovered", "true");

    act(() => {
      header.focus();
    });
    fireEvent.keyDown(header, { key: "Tab" });
    expect(header).toHaveAttribute("data-focus-visible", "true");
  });

  it("supports row selection", () => {
    renderUsersTable({ selectionMode: "single" });

    const row = screen.getByRole("row", { name: /Alice/i });
    fireEvent.click(row);

    expect(row).toHaveAttribute("data-selected", "true");
    expect(row).toHaveAttribute("aria-selected", "true");
  });

  it("reflects row hover and focus states", () => {
    renderUsersTable({ selectionMode: "single" });

    const row = screen.getByRole("row", { name: /Alice/i });

    fireEvent.pointerEnter(row, { pointerType: "mouse" });
    expect(row).toHaveAttribute("data-hovered", "true");

    act(() => {
      row.focus();
    });
    fireEvent.keyDown(row, { key: "Tab" });
    expect(row).toHaveAttribute("data-focus-visible", "true");
  });

  it("applies a custom class name to the table", () => {
    render(
      <Table aria-label="Users" items={users} className="custom-table">
        <TableHeader>
          <TableColumn id="name">Name</TableColumn>
        </TableHeader>
        <TableBody>
          {(item: User) => (
            <TableRow>
              {(_column) => <TableCell>{item.name}</TableCell>}
            </TableRow>
          )}
        </TableBody>
      </Table>,
    );

    expect(document.querySelector(".custom-table")).toBeInTheDocument();
  });

  it("throws when the body render function does not return a TableRow", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() =>
      render(
        <Table aria-label="Users" items={users}>
          <TableHeader>
            <TableColumn id="name">Name</TableColumn>
          </TableHeader>
          <TableBody>{() => <div>Invalid row</div>}</TableBody>
        </Table>,
      ),
    ).toThrow("TableBody render function must return a TableRow");

    consoleError.mockRestore();
  });

  it("throws when TableRow does not use a column render function", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const InvalidTableRow = TableRow as FC<{ children?: ReactNode }>;

    expect(() =>
      render(
        <Table aria-label="Users" items={users}>
          <TableHeader>
            <TableColumn id="name">Name</TableColumn>
          </TableHeader>
          <TableBody>
            {() => <InvalidTableRow>Invalid cells</InvalidTableRow>}
          </TableBody>
        </Table>,
      ),
    ).toThrow("TableRow must use a column render function");

    consoleError.mockRestore();
  });

  it("renders placeholder cells when the body has no render function", () => {
    render(
      <Table aria-label="Users" items={users}>
        <TableHeader>
          <TableColumn id="name">Name</TableColumn>
        </TableHeader>
        <TableBody />
      </Table>,
    );

    expect(screen.getByRole("grid", { name: "Users" })).toBeInTheDocument();
    expect(document.querySelectorAll("[data-table-cell='']")).toHaveLength(2);
  });

  it("supports multiple row selection mode", () => {
    renderUsersTable({ selectionMode: "multiple" });

    expect(screen.getByRole("grid", { name: "Users" })).toHaveAttribute(
      "aria-multiselectable",
      "true",
    );
  });

  it("marks the focused row when navigating with the keyboard", () => {
    renderUsersTable({ selectionMode: "single" });

    const firstRow = screen.getByRole("row", { name: /Alice/i });
    act(() => {
      firstRow.focus();
    });

    expect(firstRow).toHaveAttribute("data-focused", "true");
  });

  it("ignores non-column children in the header definition", () => {
    render(
      <Table aria-label="Users" items={users}>
        <TableHeader>
          <div>Not a column</div>
          <TableColumn id="name">Name</TableColumn>
          invalid marker
        </TableHeader>
        <TableBody>
          {(item: User) => (
            <TableRow>
              {(_column) => <TableCell>{item.name}</TableCell>}
            </TableRow>
          )}
        </TableBody>
      </Table>,
    );

    expect(
      screen.getByRole("columnheader", { name: "Name" }),
    ).toBeInTheDocument();
  });

  it("renders non-TableCell elements returned from the row renderer", () => {
    render(
      <Table aria-label="Users" items={users}>
        <TableHeader>
          <TableColumn id="name">Name</TableColumn>
          <TableColumn id="badge">Badge</TableColumn>
        </TableHeader>
        <TableBody>
          {(item: User) => (
            <TableRow>
              {(column) =>
                column.id === "badge" ? (
                  <span data-testid={`badge-${item.id}`}>{item.role}</span>
                ) : (
                  <TableCell>{item.name}</TableCell>
                )
              }
            </TableRow>
          )}
        </TableBody>
      </Table>,
    );

    expect(screen.getByTestId("badge-1")).toHaveTextContent("Admin");
  });

  it("allows compound subcomponents to render as declarative markers", () => {
    const { container } = render(
      <>
        <TableHeader className="header-marker" />
        <TableColumn id="name">Name</TableColumn>
        <TableBody className="body-marker" />
        <TableRow />
        <TableCell>Cell</TableCell>
      </>,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
