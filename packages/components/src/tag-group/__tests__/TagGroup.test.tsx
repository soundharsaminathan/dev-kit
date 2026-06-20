import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Tag, TagGroup, TagGroupLabel, TagList } from "../TagGroup";

describe("TagGroup", () => {
  it("renders tags from static children", () => {
    render(
      <TagGroup size="md">
        <TagGroupLabel>Categories</TagGroupLabel>
        <TagList>
          <Tag>News</Tag>
          <Tag>Travel</Tag>
        </TagList>
      </TagGroup>,
    );

    expect(document.querySelector("[data-tag-group]")).toHaveAttribute(
      "data-size",
      "md",
    );
    expect(screen.getByText("Categories")).toHaveAttribute(
      "data-tag-group-label",
      "",
    );
    expect(screen.getByText("News")).toBeInTheDocument();
    expect(screen.getByText("Travel")).toBeInTheDocument();
    expect(document.querySelectorAll("[data-tag]")).toHaveLength(2);
  });

  it("renders removable tags and calls onRemove", () => {
    const onRemove = vi.fn();

    render(
      <TagGroup onRemove={onRemove}>
        <TagList>
          <Tag id="news">News</Tag>
          <Tag id="travel">Travel</Tag>
        </TagList>
      </TagGroup>,
    );

    const removeButtons = document.querySelectorAll('[data-slot="remove"]');
    expect(removeButtons).toHaveLength(2);
    expect(removeButtons[0]?.querySelector("svg")).toBeInTheDocument();

    fireEvent.click(removeButtons[0]!);

    expect(onRemove).toHaveBeenCalled();
  });

  it("marks disabled tags", () => {
    render(
      <TagGroup>
        <TagList>
          <Tag isDisabled>News</Tag>
          <Tag>Travel</Tag>
        </TagList>
      </TagGroup>,
    );

    expect(screen.getByText("News").closest("[data-tag]")).toHaveAttribute(
      "data-disabled",
      "true",
    );
  });

  it("marks tags with links", () => {
    render(
      <TagGroup>
        <TagList>
          <Tag href="#">News</Tag>
        </TagList>
      </TagGroup>,
    );

    expect(screen.getByText("News").closest("[data-tag]")).toHaveAttribute(
      "data-href",
      "true",
    );
  });

  it("supports explicit tag ids and text values", () => {
    render(
      <TagGroup selectionMode="single" defaultSelectedKeys={["custom-id"]}>
        <TagList>
          <Tag id="custom-id" textValue="Custom news">
            News
          </Tag>
        </TagList>
      </TagGroup>,
    );

    expect(screen.getByText("News").closest("[data-tag]")).toHaveAttribute(
      "data-selected",
      "true",
    );
  });

  it("reflects hover and focus-visible states on tags", () => {
    render(
      <TagGroup>
        <TagList>
          <Tag>News</Tag>
        </TagList>
      </TagGroup>,
    );

    const tag = screen.getByText("News").closest("[data-tag]") as HTMLElement;

    fireEvent.pointerEnter(tag, { pointerType: "mouse" });
    expect(tag).toHaveAttribute("data-hovered", "true");

    act(() => {
      tag.focus();
    });
    fireEvent.keyDown(tag, { key: "Tab" });
    expect(tag).toHaveAttribute("data-focus-visible", "true");
  });

  it("does not reflect hover on disabled tags", () => {
    render(
      <TagGroup>
        <TagList>
          <Tag isDisabled>News</Tag>
        </TagList>
      </TagGroup>,
    );

    const tag = screen.getByText("News").closest("[data-tag]")!;

    fireEvent.pointerEnter(tag, { pointerType: "mouse" });

    expect(tag).not.toHaveAttribute("data-hovered");
  });

  it("applies size to the group and tag list", () => {
    render(
      <TagGroup size="lg">
        <TagList>
          <Tag>News</Tag>
        </TagList>
      </TagGroup>,
    );

    expect(document.querySelector("[data-tag-group]")).toHaveAttribute(
      "data-size",
      "lg",
    );
    expect(document.querySelector("[data-tag-list]")).toHaveAttribute(
      "data-size",
      "lg",
    );
  });

  it("ignores non-tag children when parsing tag items", () => {
    render(
      <TagGroup aria-label="Tags">
        <TagList>
          <span data-testid="marker">Marker</span>
          <Tag>News</Tag>
          not-a-tag
        </TagList>
      </TagGroup>,
    );

    expect(screen.queryByTestId("marker")).not.toBeInTheDocument();
    expect(screen.getByText("News")).toBeInTheDocument();
    expect(document.querySelectorAll("[data-tag]")).toHaveLength(1);
  });

  it("applies custom class names", () => {
    render(
      <TagGroup className="custom-group">
        <TagGroupLabel className="custom-label">Categories</TagGroupLabel>
        <TagList className="custom-list">
          <Tag>News</Tag>
        </TagList>
      </TagGroup>,
    );

    expect(document.querySelector(".custom-group")).toBeInTheDocument();
    expect(document.querySelector(".custom-label")).toBeInTheDocument();
    expect(document.querySelector(".custom-list")).toBeInTheDocument();
  });

  it("renders Tag as a declarative marker only", () => {
    const { container } = render(<Tag>News</Tag>);

    expect(container).toBeEmptyDOMElement();
  });

  it("throws when TagGroupLabel is used outside TagGroup", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<TagGroupLabel>Categories</TagGroupLabel>)).toThrow(
      "TagGroupLabel must be used within TagGroup",
    );

    consoleError.mockRestore();
  });

  it("throws when TagList is used outside TagGroup", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() =>
      render(
        <TagList>
          <Tag>News</Tag>
        </TagList>,
      ),
    ).toThrow("TagList must be used within TagGroup");

    consoleError.mockRestore();
  });

  it("renders tags with non-string labels", () => {
    render(
      <TagGroup aria-label="Labels">
        <TagList>
          <Tag id="featured">
            <span>Featured</span>
          </Tag>
        </TagList>
      </TagGroup>,
    );

    expect(screen.getByText("Featured")).toBeInTheDocument();
  });

  it("renders an empty tag group when TagList is omitted", () => {
    render(
      <TagGroup aria-label="Empty">
        <TagGroupLabel>Categories</TagGroupLabel>
      </TagGroup>,
    );

    expect(document.querySelector("[data-tag-group]")).toBeInTheDocument();
    expect(document.querySelectorAll("[data-tag]")).toHaveLength(0);
  });
});
