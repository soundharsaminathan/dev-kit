// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { TestProviders } from "@/test-utils/providers";

type DropHandler = (event: Record<string, unknown>) => Promise<void>;

let capturedOnDrop: DropHandler | undefined;

vi.mock("@dev-ui/components/drop-zone", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@dev-ui/components/drop-zone")>();
  return {
    ...actual,
    DropZone: ({
      onDrop,
      children,
    }: {
      onDrop?: DropHandler;
      children: ReactNode;
    }) => {
      capturedOnDrop = onDrop;
      return <div data-testid="drop-zone">{children}</div>;
    },
  };
});

import DropZonePlayground from "@/registry/drop-zone/playground";

describe("DropZonePlayground", () => {
  it("ignores drop events without items", async () => {
    render(
      <TestProviders>
        <DropZonePlayground label="Drop files here" />
      </TestProviders>,
    );

    await capturedOnDrop?.({});

    expect(screen.getByText("Drop files here")).toBeInTheDocument();
  });

  it("shows dropped file names and falls back when empty", async () => {
    render(
      <TestProviders>
        <DropZonePlayground label="Drop files here" />
      </TestProviders>,
    );

    await capturedOnDrop?.({
      items: [
        {
          kind: "file",
          getFile: async () => new File(["content"], "report.pdf"),
        },
        {
          kind: "string",
          getFile: async () => new File([], "ignored.txt"),
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByText("report.pdf")).toBeInTheDocument();
    });

    await capturedOnDrop?.({
      items: [
        {
          kind: "file",
          getFile: async () => new File([], ""),
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByText("Dropped")).toBeInTheDocument();
    });
  });
});
