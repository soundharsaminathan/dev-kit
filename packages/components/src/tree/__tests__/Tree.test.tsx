import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Tree, TreeItem, TreeItemContent } from "../Tree";

const items = [
  {
    id: "1",
    title: "Documents",
    children: [{ id: "1-1", title: "Project" }],
  },
  { id: "2", title: "Photos" },
];

describe("Tree", () => {
  it("renders static tree items", () => {
    render(
      <Tree aria-label="Files">
        <TreeItem id="1" textValue="Documents">
          Documents
          <TreeItem id="1-1" textValue="Project">
            Project
          </TreeItem>
        </TreeItem>
        <TreeItem id="2" textValue="Photos">
          Photos
        </TreeItem>
      </Tree>,
    );

    expect(document.querySelector("[data-tree]")).toHaveAttribute(
      "aria-label",
      "Files",
    );
    expect(screen.getByText("Documents")).toBeInTheDocument();
    expect(screen.getByText("Photos")).toBeInTheDocument();
    expect(document.querySelectorAll("[data-tree-item]")).toHaveLength(2);
  });

  it("renders items from a collection", () => {
    render(
      <Tree items={items} aria-label="Files">
        {(item) => <TreeItemContent>{item.title}</TreeItemContent>}
      </Tree>,
    );

    expect(screen.getByText("Documents")).toBeInTheDocument();
    expect(screen.getByText("Photos")).toBeInTheDocument();
  });

  it("shows nested items when expanded", () => {
    render(
      <Tree aria-label="Files" defaultExpandedKeys={["1"]}>
        <TreeItem id="1" textValue="Documents">
          Documents
          <TreeItem id="1-1" textValue="Project">
            Project
          </TreeItem>
        </TreeItem>
        <TreeItem id="2" textValue="Photos">
          Photos
        </TreeItem>
      </Tree>,
    );

    expect(screen.getByText("Project")).toBeInTheDocument();
    expect(document.querySelectorAll("[data-tree-item]")).toHaveLength(3);
  });

  it("expands nested items on demand", () => {
    render(
      <Tree items={items} aria-label="Files">
        {(item) => <TreeItemContent>{item.title}</TreeItemContent>}
      </Tree>,
    );

    expect(screen.queryByText("Project")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /expand documents/i }));

    expect(screen.getByText("Project")).toBeInTheDocument();
  });

  it("renders selection checkboxes when selectionMode is multiple", () => {
    render(
      <Tree items={items} aria-label="Files" selectionMode="multiple">
        {(item) => <TreeItemContent>{item.title}</TreeItemContent>}
      </Tree>,
    );

    expect(document.querySelectorAll("[data-checkbox-control]")).toHaveLength(
      2,
    );
    expect(document.querySelector("[data-tree]")).toHaveAttribute(
      "data-selection-mode",
      "multiple",
    );
  });

  it("toggles selection when clicking a checkbox", () => {
    render(
      <Tree
        items={items}
        aria-label="Files"
        selectionMode="multiple"
        defaultExpandedKeys={["1"]}
      >
        {(item) => <TreeItemContent>{item.title}</TreeItemContent>}
      </Tree>,
    );

    const documentsCheckbox = screen.getByRole("checkbox", {
      name: /select documents/i,
    });
    const projectCheckbox = screen.getByRole("checkbox", {
      name: /select project/i,
    });

    expect(documentsCheckbox).not.toBeChecked();
    expect(projectCheckbox).not.toBeChecked();

    fireEvent.click(documentsCheckbox);
    expect(documentsCheckbox).toBeChecked();
    expect(projectCheckbox).not.toBeChecked();

    fireEvent.click(projectCheckbox);
    expect(documentsCheckbox).toBeChecked();
    expect(projectCheckbox).toBeChecked();

    fireEvent.click(documentsCheckbox);
    expect(documentsCheckbox).not.toBeChecked();
    expect(projectCheckbox).toBeChecked();
  });

  it("supports single selection mode", () => {
    render(
      <Tree
        items={items}
        aria-label="Files"
        selectionMode="single"
        defaultSelectedKeys={["2"]}
      >
        {(item) => <TreeItemContent>{item.title}</TreeItemContent>}
      </Tree>,
    );

    const photosItem = screen
      .getByText("Photos")
      .closest("[data-tree-item]") as HTMLElement;
    expect(photosItem).toHaveAttribute("data-selected", "true");

    fireEvent.click(screen.getByText("Documents"));
    expect(photosItem).not.toHaveAttribute("data-selected");
  });

  it("marks disabled tree items", () => {
    const disabledItems = [
      { id: "1", title: "Documents", isDisabled: true },
      { id: "2", title: "Photos" },
    ];

    render(
      <Tree items={disabledItems} aria-label="Files">
        {(item) => <TreeItemContent>{item.title}</TreeItemContent>}
      </Tree>,
    );

    const documentsItem = screen
      .getByText("Documents")
      .closest("[data-tree-item]") as HTMLElement;
    expect(documentsItem).toHaveAttribute("data-disabled", "true");
  });

  it("renders static tree items with nested children", () => {
    render(
      <Tree aria-label="Files" defaultExpandedKeys={["1"]}>
        <TreeItem id="1" textValue="Documents">
          Documents
          <TreeItem id="1-1" textValue="Notes">
            Notes
          </TreeItem>
        </TreeItem>
      </Tree>,
    );

    expect(screen.getByText("Notes")).toBeInTheDocument();
    expect(
      document.querySelector("[data-tree-item-spacer='']"),
    ).toBeInTheDocument();
  });

  it("reflects hover and focus states on tree items", () => {
    render(
      <Tree items={items} aria-label="Files">
        {(item) => <TreeItemContent>{item.title}</TreeItemContent>}
      </Tree>,
    );

    const photos = screen.getByText("Photos").closest("[data-tree-item]")!;
    fireEvent.pointerEnter(photos, { pointerType: "mouse" });
    expect(photos).toHaveAttribute("data-hovered", "true");
  });

  it("uses explicit disabledKeys when provided", () => {
    render(
      <Tree items={items} aria-label="Files" disabledKeys={new Set(["2"])}>
        {(item) => <TreeItemContent>{item.title}</TreeItemContent>}
      </Tree>,
    );

    const photosItem = screen
      .getByText("Photos")
      .closest("[data-tree-item]") as HTMLElement;
    expect(photosItem).toHaveAttribute("data-disabled", "true");
  });

  it("collapses expanded items", () => {
    render(
      <Tree items={items} aria-label="Files" defaultExpandedKeys={["1"]}>
        {(item) => <TreeItemContent>{item.title}</TreeItemContent>}
      </Tree>,
    );

    expect(screen.getByText("Project")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /collapse documents/i }),
    );

    expect(screen.queryByText("Project")).not.toBeInTheDocument();
  });

  it("selects items in single selection mode by clicking the row", () => {
    render(
      <Tree items={items} aria-label="Files" selectionMode="single">
        {(item) => <TreeItemContent>{item.title}</TreeItemContent>}
      </Tree>,
    );

    fireEvent.click(screen.getByText("Photos"));

    const photosItem = screen
      .getByText("Photos")
      .closest("[data-tree-item]") as HTMLElement;
    expect(photosItem).toHaveAttribute("data-selected", "true");
  });

  it("renders collection items using textValue when title is absent", () => {
    const textValueItems = [{ id: "x", textValue: "Archive" }];

    render(
      <Tree items={textValueItems} aria-label="Files">
        {(item) => <TreeItemContent>{item.textValue}</TreeItemContent>}
      </Tree>,
    );

    expect(screen.getByRole("row", { name: "Archive" })).toBeInTheDocument();
  });

  it("uses custom selectionBehavior when provided", () => {
    render(
      <Tree
        items={items}
        aria-label="Files"
        selectionMode="multiple"
        selectionBehavior="replace"
      >
        {(item) => <TreeItemContent>{item.title}</TreeItemContent>}
      </Tree>,
    );

    expect(document.querySelector("[data-tree]")).toHaveAttribute(
      "data-selection-mode",
      "multiple",
    );
    expect(document.querySelectorAll("[data-checkbox-control]")).toHaveLength(
      0,
    );
  });
});
