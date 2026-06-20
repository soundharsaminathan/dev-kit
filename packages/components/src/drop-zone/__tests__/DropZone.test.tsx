import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DropZone, DropZoneLabel } from "../DropZone";

describe("DropZone", () => {
  it("renders with label slot", () => {
    render(
      <DropZone>
        <DropZoneLabel>Drop files here</DropZoneLabel>
      </DropZone>,
    );

    expect(document.querySelector("[data-drop-zone]")).toBeInTheDocument();
    expect(screen.getByText("Drop files here")).toHaveAttribute(
      "data-slot",
      "label",
    );
  });

  it("marks disabled state", () => {
    render(
      <DropZone isDisabled>
        <DropZoneLabel>Disabled</DropZoneLabel>
      </DropZone>,
    );

    expect(document.querySelector("[data-drop-zone]")).toHaveAttribute(
      "data-disabled",
      "true",
    );
  });

  it("forwards drop handlers to useDrop", () => {
    const onDrop = vi.fn();
    const getDropOperation = vi.fn(() => "copy" as const);

    render(
      <DropZone onDrop={onDrop} getDropOperation={getDropOperation}>
        <DropZoneLabel>Drop files here</DropZoneLabel>
      </DropZone>,
    );

    expect(document.querySelector("[data-drop-zone]")).toBeInTheDocument();
    expect(getDropOperation).not.toHaveBeenCalled();
  });

  it("does not mark disabled when isDisabled is omitted", () => {
    render(
      <DropZone>
        <DropZoneLabel>Enabled</DropZoneLabel>
      </DropZone>,
    );

    expect(document.querySelector("[data-drop-zone]")).not.toHaveAttribute(
      "data-disabled",
    );
  });
});
