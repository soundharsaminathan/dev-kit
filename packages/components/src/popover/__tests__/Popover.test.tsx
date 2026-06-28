import "@testing-library/jest-dom/vitest";
import { useOverlayTriggerState } from "@react-stately/overlays";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OverlayProvider, Popover, PopoverProvider } from "../Popover";

type PopoverHarnessProps = {
  defaultOpen?: boolean;
  isNonModal?: boolean;
  placement?: "top" | "bottom";
  offset?: number;
  withInputGroup?: boolean;
};

function PopoverHarness({
  defaultOpen = true,
  isNonModal,
  placement,
  offset,
  withInputGroup = false,
}: PopoverHarnessProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const state = useOverlayTriggerState({ defaultOpen });

  const trigger = (
    <button ref={triggerRef} type="button">
      Trigger
    </button>
  );

  return (
    <OverlayProvider>
      {withInputGroup ? (
        <div data-input-group="" style={{ width: 240 }}>
          {trigger}
        </div>
      ) : (
        trigger
      )}
      <PopoverProvider
        value={{
          triggerRef,
          state,
          popoverRef,
          placement,
          offset,
          isNonModal,
        }}
      >
        <Popover className="custom-popover">Popover content</Popover>
      </PopoverProvider>
    </OverlayProvider>
  );
}

describe("Popover", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders popover content when open", () => {
    render(<PopoverHarness />);
    expect(screen.getByText("Popover content")).toBeInTheDocument();
    expect(screen.getByText("Popover content")).toHaveAttribute(
      "data-popover",
      "",
    );
  });

  it("does not render when closed", () => {
    render(<PopoverHarness defaultOpen={false} />);
    expect(screen.queryByText("Popover content")).not.toBeInTheDocument();
  });

  it("renders a modal underlay by default", () => {
    render(<PopoverHarness />);
    const popover = screen.getByText("Popover content");
    const overlayRoot = popover.parentElement;

    expect(overlayRoot?.children.length).toBeGreaterThan(1);
  });

  it("skips the underlay for non-modal popovers", () => {
    const { container } = render(<PopoverHarness isNonModal />);
    expect(
      container.querySelector('[class*="underlay"]'),
    ).not.toBeInTheDocument();
  });

  it("closes when dismiss button is activated", () => {
    render(<PopoverHarness />);
    expect(screen.getByText("Popover content")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.queryByText("Popover content")).not.toBeInTheDocument();
  });

  it("syncs trigger width from an input group container", () => {
    render(<PopoverHarness withInputGroup />);

    const popover = screen.getByText("Popover content");
    expect(popover.style.getPropertyValue("--trigger-width")).not.toBe("");
  });

  it("throws when used outside PopoverProvider", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() =>
      render(
        <OverlayProvider>
          <Popover>Orphan popover</Popover>
        </OverlayProvider>,
      ),
    ).toThrow(
      "Popover must be used within a picker that provides PopoverContext",
    );

    consoleError.mockRestore();
  });
});
