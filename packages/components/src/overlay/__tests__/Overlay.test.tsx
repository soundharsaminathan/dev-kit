import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Dialog } from "../../dialog/Dialog";
import { Overlay } from "../Overlay";

function mockMobileViewport(isMobile: boolean) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: isMobile ? 480 : 1024,
  });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => ({
      matches: isMobile && query.includes("max-width"),
      media: query,
      addEventListener: vi.fn((_event: string, listener: () => void) => {
        listener();
      }),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("Overlay", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it("renders popover content inside a dialog", () => {
    render(
      <Dialog defaultOpen>
        <button type="button">Open</button>
        <Overlay type="popover">
          <div>Popover content</div>
        </Overlay>
      </Dialog>,
    );

    expect(screen.getByText("Popover content")).toBeInTheDocument();
    expect(document.querySelector("[data-popover='']")).toBeInTheDocument();
  });

  it("renders a standalone drawer with controlled open state", () => {
    render(
      <Overlay type="drawer" defaultOpen isDismissable>
        <div>Standalone drawer</div>
      </Overlay>,
    );

    expect(screen.getByText("Standalone drawer")).toBeInTheDocument();
    expect(document.querySelector("[data-drawer='']")).toBeInTheDocument();
  });

  it("uses drawer on mobile viewports by default", () => {
    mockMobileViewport(true);

    render(
      <Dialog defaultOpen>
        <button type="button">Open</button>
        <Overlay>
          <div>Mobile drawer</div>
        </Overlay>
      </Dialog>,
    );

    expect(document.querySelector("[data-drawer='']")).toBeInTheDocument();
  });

  it("keeps modal on mobile when mobileType is null", () => {
    mockMobileViewport(true);

    render(
      <Dialog defaultOpen>
        <button type="button">Open</button>
        <Overlay mobileType={null}>
          <div>Mobile modal</div>
        </Overlay>
      </Dialog>,
    );

    expect(document.querySelector("[data-modal='']")).toBeInTheDocument();
  });

  it("forwards dismiss props to modal overlays", () => {
    render(
      <Dialog defaultOpen>
        <button type="button">Open</button>
        <Overlay
          isDismissable
          isKeyboardDismissDisabled
          shouldCloseOnInteractOutside={() => false}
        >
          <div>Dismissable modal</div>
        </Overlay>
      </Dialog>,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByText("Dismissable modal")).toBeInTheDocument();
  });

  it("renders a standalone popover without dialog context", () => {
    expect(() =>
      render(
        <Overlay type="popover">
          <div>Standalone popover</div>
        </Overlay>,
      ),
    ).toThrow(/Popover must be used within a picker/);
  });

  it("keeps desktop type when viewport is not mobile", () => {
    mockMobileViewport(false);

    render(
      <Dialog defaultOpen>
        <button type="button">Open</button>
        <Overlay type="modal" mobileType="drawer">
          <div>Desktop modal</div>
        </Overlay>
      </Dialog>,
    );

    expect(document.querySelector("[data-modal='']")).toBeInTheDocument();
    expect(document.querySelector("[data-drawer='']")).not.toBeInTheDocument();
  });
});
