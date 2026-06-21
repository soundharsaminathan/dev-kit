import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Dialog } from "../../dialog/Dialog";
import { Overlay } from "../Overlay";

describe("Overlay", () => {
  it("renders modal content by default", () => {
    render(
      <Dialog defaultOpen>
        <button type="button">Open</button>
        <Overlay>
          <div>Overlay content</div>
        </Overlay>
      </Dialog>,
    );

    expect(screen.getByText("Overlay content")).toBeInTheDocument();
    expect(document.querySelector("[data-modal='']")).toBeInTheDocument();
  });

  it("renders drawer when type is drawer", () => {
    render(
      <Dialog defaultOpen>
        <button type="button">Open</button>
        <Overlay type="drawer">
          <div>Drawer content</div>
        </Overlay>
      </Dialog>,
    );

    expect(screen.getByText("Drawer content")).toBeInTheDocument();
    expect(document.querySelector("[data-drawer='']")).toBeInTheDocument();
  });
});
