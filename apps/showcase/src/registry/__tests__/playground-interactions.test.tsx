// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DateFieldPlayground from "@/registry/date-field/playground";
import FileTriggerPlayground from "@/registry/file-trigger/playground";
import PaginationPlayground from "@/registry/pagination/playground";
import PopoverPlayground from "@/registry/popover/playground";
import ScrollFadePlayground from "@/registry/scroll-fade/playground";
import SeparatorPlayground from "@/registry/separator/playground";
import SkeletonPlayground from "@/registry/skeleton/playground";
import TagGroupPlayground from "@/registry/tag-group/playground";
import ToastPlayground from "@/registry/toast/playground";
import TreePlayground from "@/registry/tree/playground";
import { TestProviders } from "@/test-utils/providers";

describe("playground interactions", () => {
  it("updates pagination state", () => {
    render(
      <TestProviders>
        <PaginationPlayground totalPages={10} initialPage={5} />
      </TestProviders>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Go to next page" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Go to previous page" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "10" }));
  });

  it("shows a toast with an action", () => {
    render(
      <TestProviders>
        <ToastPlayground showAction actionLabel="Install" />
      </TestProviders>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show toast" }));
    expect(screen.getByText("Files uploaded")).toBeInTheDocument();
  });

  it("shows a toast without an action when the label is empty", () => {
    render(
      <TestProviders>
        <ToastPlayground showAction actionLabel="" />
      </TestProviders>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show toast" }));
    expect(screen.getByText("Files uploaded")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Install" }),
    ).not.toBeInTheDocument();
  });

  it("renders a vertical separator", () => {
    const { container } = render(
      <TestProviders>
        <SeparatorPlayground orientation="vertical" />
      </TestProviders>,
    );

    expect(container.querySelector('[role="separator"]')).toBeInTheDocument();
  });

  it("renders date field label as a prop with description and error", () => {
    render(
      <TestProviders>
        <DateFieldPlayground
          labelMode="prop"
          label="Appointment"
          description="Pick a day"
          errorMessage="Required"
          isInvalid
        />
      </TestProviders>,
    );

    expect(screen.getAllByText("Appointment").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pick a day").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Required").length).toBeGreaterThan(0);
  });

  it("handles file selection in single and multiple modes", () => {
    const { rerender } = render(
      <TestProviders>
        <FileTriggerPlayground />
      </TestProviders>,
    );

    const input = document.querySelector('input[type="file"]');
    expect(input).not.toBeNull();
    fireEvent.change(input!, {
      target: { files: [new File(["content"], "report.pdf")] },
    });
    expect(
      screen.getByRole("button", { name: "report.pdf" }),
    ).toBeInTheDocument();

    rerender(
      <TestProviders>
        <FileTriggerPlayground allowsMultiple />
      </TestProviders>,
    );

    const multiInput = document.querySelector('input[type="file"]');
    fireEvent.change(multiInput!, {
      target: {
        files: [new File(["a"], "a.txt"), new File(["b"], "b.txt")],
      },
    });
    expect(screen.getByText("2 files selected")).toBeInTheDocument();
    expect(screen.getByText("a.txt")).toBeInTheDocument();
  });

  it("handles removable tags", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    render(
      <TestProviders>
        <TagGroupPlayground isRemovable label="Removable tags" />
      </TestProviders>,
    );

    expect(screen.getByText("Removable tags")).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it("renders tree with collection items", () => {
    render(
      <TestProviders>
        <TreePlayground useCollection selectionMode="multiple" />
      </TestProviders>,
    );

    expect(screen.getByRole("treegrid", { name: "Files" })).toBeInTheDocument();
    expect(screen.getByText("Documents")).toBeInTheDocument();
  });

  it("renders horizontal scroll fade", () => {
    render(
      <TestProviders>
        <ScrollFadePlayground
          direction="horizontal"
          itemCount={5}
          width={120}
        />
      </TestProviders>,
    );

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("opens popover from trigger", () => {
    render(
      <TestProviders>
        <PopoverPlayground defaultOpen={false} content="Hidden popover" />
      </TestProviders>,
    );

    expect(screen.queryByText("Hidden popover")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Trigger" }));
    expect(screen.getByText("Hidden popover")).toBeInTheDocument();
  });

  it("renders placeholder skeleton variant", () => {
    render(
      <TestProviders>
        <SkeletonPlayground variant="placeholder" animation="pulse" />
      </TestProviders>,
    );

    expect(
      document.querySelector("[data-skeleton-loading]"),
    ).toBeInTheDocument();
  });
});
