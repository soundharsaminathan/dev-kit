// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { DragAndDropOptions } from "@dev-ui/components/drag-and-drop";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TestProviders } from "@/test-utils/providers";

let capturedOptions: DragAndDropOptions | undefined;

vi.mock("@dev-ui/components/drag-and-drop", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@dev-ui/components/drag-and-drop")>();
  return {
    ...actual,
    useDragAndDrop: (options: DragAndDropOptions) => {
      capturedOptions = options;
      return { dragAndDropHooks: {} };
    },
  };
});

import DragAndDropPlayground from "@/registry/drag-and-drop/playground";

describe("DragAndDropPlayground", () => {
  it("handles before and after reorder events", () => {
    render(
      <TestProviders>
        <DragAndDropPlayground aria-label="Files" />
      </TestProviders>,
    );

    expect(screen.getByText("Documents")).toBeInTheDocument();
    expect(capturedOptions?.onReorder).toBeTypeOf("function");

    capturedOptions?.onReorder?.({
      target: { key: 3, dropPosition: "before" },
      keys: new Set([1]),
    } as Parameters<NonNullable<DragAndDropOptions["onReorder"]>>[0]);
    capturedOptions?.onReorder?.({
      target: { key: 2, dropPosition: "after" },
      keys: new Set([4]),
    } as Parameters<NonNullable<DragAndDropOptions["onReorder"]>>[0]);

    expect(
      capturedOptions?.getItems?.(new Set([1]), [
        { id: 1, label: "Documents" },
      ]),
    ).toEqual([{ "text/plain": "Documents" }]);
    expect(screen.getByText("Documents")).toBeInTheDocument();
  });

  it("ignores reorder events with unsupported drop positions", () => {
    render(
      <TestProviders>
        <DragAndDropPlayground aria-label="Files" />
      </TestProviders>,
    );

    capturedOptions?.onReorder?.({
      target: { key: 2, dropPosition: "on" },
      keys: new Set([1]),
    } as Parameters<NonNullable<DragAndDropOptions["onReorder"]>>[0]);

    expect(screen.getByText("Documents")).toBeInTheDocument();
  });

  it("ignores reorder events with unknown targets", () => {
    render(
      <TestProviders>
        <DragAndDropPlayground aria-label="Files" />
      </TestProviders>,
    );

    capturedOptions?.onReorder?.({
      target: { key: 999, dropPosition: "before" },
      keys: new Set([1]),
    } as Parameters<NonNullable<DragAndDropOptions["onReorder"]>>[0]);

    expect(screen.getByText("Documents")).toBeInTheDocument();
  });
});
