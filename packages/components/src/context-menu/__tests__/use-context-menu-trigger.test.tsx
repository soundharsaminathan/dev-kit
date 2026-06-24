import "@testing-library/jest-dom/vitest";
import {
  act,
  createEvent,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { type MouseEvent as ReactMouseEvent, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONTEXT_MENU_OPEN_EVENT,
  useContextMenuTrigger,
} from "../use-context-menu-trigger";

function createTouchList(
  target: Element,
  touches: Array<{ clientX: number; clientY: number }>,
) {
  const list = touches.map((touch, index) => ({
    identifier: index,
    target,
    clientX: touch.clientX,
    clientY: touch.clientY,
    pageX: touch.clientX,
    pageY: touch.clientY,
    screenX: touch.clientX,
    screenY: touch.clientY,
    radiusX: 1,
    radiusY: 1,
    rotationAngle: 0,
    force: 1,
  }));

  return Object.assign(list, {
    item: (index: number) => list[index] ?? null,
  });
}

function dispatchTouchEvent(
  target: Element,
  type: "touchstart" | "touchmove" | "touchend" | "touchcancel",
  touches: Array<{ clientX: number; clientY: number }>,
) {
  const touchList = createTouchList(target, touches);
  const event = new Event(type, {
    bubbles: true,
    cancelable: true,
  }) as TouchEvent;

  Object.defineProperty(event, "touches", { value: touchList });
  Object.defineProperty(event, "targetTouches", { value: touchList });
  Object.defineProperty(event, "changedTouches", { value: touchList });

  act(() => {
    target.dispatchEvent(event);
  });
}

function fireTouchStart(
  target: Element,
  touches: Array<{ clientX: number; clientY: number }>,
) {
  dispatchTouchEvent(target, "touchstart", touches);
}

function fireTouchMove(
  target: Element,
  touches: Array<{ clientX: number; clientY: number }>,
) {
  dispatchTouchEvent(target, "touchmove", touches);
}

function mockRect(element: HTMLElement, rect: Partial<DOMRect>) {
  element.getBoundingClientRect = () =>
    ({
      x: rect.left ?? 0,
      y: rect.top ?? 0,
      width: rect.width ?? 100,
      height: rect.height ?? 40,
      top: rect.top ?? 0,
      left: rect.left ?? 0,
      right: rect.right ?? 100,
      bottom: rect.bottom ?? 40,
      toJSON: () => ({}),
    }) as DOMRect;
}

function ContextMenuTriggerHarness({
  isDisabled = false,
  initialOpen = false,
  onContextMenu,
  menuContent,
}: {
  isDisabled?: boolean;
  initialOpen?: boolean;
  onContextMenu?: (event: ReactMouseEvent<HTMLDivElement>) => void;
  menuContent?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const open = vi.fn(() => setIsOpen(true));
  const close = vi.fn(() => setIsOpen(false));
  const state = { isOpen, open, close };

  const { anchor, anchorRefCallback, menuRef, triggerProps, triggerRef } =
    useContextMenuTrigger({
      state,
      isDisabled,
      onContextMenu,
    });

  return (
    <>
      <div
        {...triggerProps}
        ref={triggerRef}
        data-context-menu=""
        data-disabled={isDisabled ? "" : undefined}
        data-testid="trigger"
      >
        Trigger
      </div>
      <span
        key={anchor.key}
        ref={anchorRefCallback}
        data-testid="anchor"
        style={{
          left: anchor.x,
          top: anchor.y,
          width: anchor.size,
          height: anchor.size,
        }}
      />
      <div ref={menuRef} data-popover="" data-testid="menu">
        {menuContent ?? (isOpen ? "Menu" : null)}
      </div>
      <div data-testid="state-open">{String(isOpen)}</div>
    </>
  );
}

describe("useContextMenuTrigger", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens at the pointer position on context menu", () => {
    render(<ContextMenuTriggerHarness />);
    const trigger = screen.getByTestId("trigger");
    mockRect(trigger, { left: 0, top: 0, width: 120, height: 40 });

    fireEvent.contextMenu(trigger, { clientX: 40, clientY: 20 });

    expect(screen.getByTestId("state-open")).toHaveTextContent("true");
    expect(screen.getByTestId("anchor")).toHaveStyle({
      left: "40px",
      top: "20px",
      width: "0px",
    });
  });

  it("ignores context menu when disabled", () => {
    render(<ContextMenuTriggerHarness isDisabled />);

    fireEvent.contextMenu(screen.getByTestId("trigger"), {
      clientX: 40,
      clientY: 20,
    });

    expect(screen.getByTestId("state-open")).toHaveTextContent("false");
  });

  it("respects defaultPrevented from onContextMenu", () => {
    render(
      <ContextMenuTriggerHarness
        onContextMenu={(event) => {
          event.preventDefault();
        }}
      />,
    );

    fireEvent.contextMenu(screen.getByTestId("trigger"), {
      clientX: 40,
      clientY: 20,
    });

    expect(screen.getByTestId("state-open")).toHaveTextContent("false");
  });

  it("opens from the custom context menu open event", () => {
    render(<ContextMenuTriggerHarness />);
    const trigger = screen.getByTestId("trigger");

    act(() => {
      trigger.dispatchEvent(
        new CustomEvent(CONTEXT_MENU_OPEN_EVENT, {
          bubbles: false,
          detail: { x: 80, y: 60, size: 12 },
        }),
      );
    });

    expect(screen.getByTestId("state-open")).toHaveTextContent("true");
    expect(screen.getByTestId("anchor")).toHaveStyle({ width: "12px" });
  });

  it("opens on long press touch", () => {
    render(<ContextMenuTriggerHarness />);
    const trigger = screen.getByTestId("trigger");

    fireTouchStart(trigger, [{ clientX: 30, clientY: 40 }]);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByTestId("state-open")).toHaveTextContent("true");
    expect(screen.getByTestId("anchor")).toHaveStyle({ width: "10px" });
  });

  it("cancels long press when the finger moves too far", () => {
    render(<ContextMenuTriggerHarness />);
    const trigger = screen.getByTestId("trigger");

    fireTouchStart(trigger, [{ clientX: 30, clientY: 40 }]);
    fireTouchMove(trigger, [{ clientX: 50, clientY: 40 }]);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByTestId("state-open")).toHaveTextContent("false");
  });

  it("cancels long press on touch end and touch cancel", () => {
    const { rerender } = render(<ContextMenuTriggerHarness />);
    const trigger = screen.getByTestId("trigger");

    fireTouchStart(trigger, [{ clientX: 30, clientY: 40 }]);
    fireEvent.touchEnd(trigger);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByTestId("state-open")).toHaveTextContent("false");

    rerender(<ContextMenuTriggerHarness />);
    fireTouchStart(screen.getByTestId("trigger"), [
      { clientX: 30, clientY: 40 },
    ]);
    fireEvent.touchCancel(screen.getByTestId("trigger"));
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByTestId("state-open")).toHaveTextContent("false");
  });

  it("ignores multi-touch and missing touch data", () => {
    render(<ContextMenuTriggerHarness />);
    const trigger = screen.getByTestId("trigger");

    fireTouchStart(trigger, [
      { clientX: 10, clientY: 10 },
      { clientX: 20, clientY: 20 },
    ]);
    fireTouchMove(trigger, []);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByTestId("state-open")).toHaveTextContent("false");
  });

  it("closes on mouse up outside after the suppression window", () => {
    render(<ContextMenuTriggerHarness />);
    const trigger = screen.getByTestId("trigger");

    fireEvent.contextMenu(trigger, { clientX: 40, clientY: 20 });
    expect(screen.getByTestId("state-open")).toHaveTextContent("true");

    act(() => {
      fireEvent.mouseUp(document.body, { clientX: 0, clientY: 0 });
    });
    expect(screen.getByTestId("state-open")).toHaveTextContent("true");

    act(() => {
      vi.advanceTimersByTime(500);
    });

    act(() => {
      fireEvent.contextMenu(trigger, { clientX: 40, clientY: 20 });
      vi.advanceTimersByTime(500);
      fireEvent.mouseUp(document.body, { clientX: 0, clientY: 0 });
    });

    expect(screen.getByTestId("state-open")).toHaveTextContent("false");
  });

  it("does not close when mouse up happens on the menu", () => {
    render(
      <ContextMenuTriggerHarness
        menuContent={<button type="button">Action</button>}
      />,
    );
    const trigger = screen.getByTestId("trigger");

    fireEvent.contextMenu(trigger, { clientX: 40, clientY: 20 });

    act(() => {
      vi.advanceTimersByTime(500);
      fireEvent.mouseUp(screen.getByRole("button", { name: "Action" }), {
        clientX: 40,
        clientY: 20,
      });
    });

    expect(screen.getByTestId("state-open")).toHaveTextContent("true");
  });

  it("prevents document context menu on an open popover", () => {
    render(<ContextMenuTriggerHarness initialOpen />);
    const menu = screen.getByTestId("menu");
    const event = createEvent.contextMenu(menu, {
      bubbles: true,
      cancelable: true,
      clientX: 10,
      clientY: 10,
    });

    act(() => {
      fireEvent(menu, event);
    });

    expect(event.defaultPrevented).toBe(true);
  });

  it("reopens at a new point when already open on the same trigger", () => {
    render(<ContextMenuTriggerHarness initialOpen />);
    const trigger = screen.getByTestId("trigger");
    mockRect(trigger, {
      left: 0,
      top: 0,
      width: 200,
      height: 80,
      right: 200,
      bottom: 80,
    });

    expect(screen.getByTestId("anchor")).toHaveStyle({
      left: "0px",
      top: "0px",
    });

    fireEvent.contextMenu(trigger, { clientX: 50, clientY: 25 });

    expect(screen.getByTestId("state-open")).toHaveTextContent("true");
    expect(screen.getByTestId("anchor")).toHaveStyle({
      left: "50px",
      top: "25px",
    });
  });

  it("delegates to another trigger while open and closes the current menu", () => {
    render(
      <>
        <ContextMenuTriggerHarness initialOpen />
        <ContextMenuTriggerHarness />
      </>,
    );

    const triggers = screen.getAllByTestId("trigger");
    const [firstTrigger, secondTrigger] = triggers;
    mockRect(firstTrigger!, {
      left: 0,
      top: 0,
      width: 200,
      height: 80,
      right: 200,
      bottom: 80,
    });
    mockRect(secondTrigger!, {
      left: 0,
      top: 100,
      width: 80,
      height: 40,
      right: 80,
      bottom: 140,
    });

    fireEvent.contextMenu(document.body, { clientX: 40, clientY: 120 });

    const openStates = screen.getAllByTestId("state-open");
    expect(openStates[0]).toHaveTextContent("false");
    expect(openStates[1]).toHaveTextContent("true");
  });

  it("closes when opening on a disabled trigger while another menu is open", () => {
    render(
      <>
        <ContextMenuTriggerHarness initialOpen />
        <ContextMenuTriggerHarness isDisabled />
      </>,
    );

    const [enabledTrigger, disabledTrigger] = screen.getAllByTestId("trigger");
    mockRect(enabledTrigger!, {
      left: 0,
      top: 0,
      width: 200,
      height: 80,
      right: 200,
      bottom: 80,
    });
    mockRect(disabledTrigger!, {
      left: 0,
      top: 100,
      width: 80,
      height: 40,
      right: 80,
      bottom: 140,
    });

    fireEvent.contextMenu(document.body, { clientX: 40, clientY: 120 });

    expect(screen.getAllByTestId("state-open")[0]).toHaveTextContent("false");
    expect(screen.getAllByTestId("state-open")[1]).toHaveTextContent("false");
  });

  it("cleans up timers on unmount", () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const { unmount } = render(<ContextMenuTriggerHarness />);
    const trigger = screen.getByTestId("trigger");

    fireTouchStart(screen.getByTestId("trigger"), [
      { clientX: 10, clientY: 10 },
    ]);
    fireEvent.contextMenu(trigger, { clientX: 10, clientY: 10 });

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it("ignores touch starts without a primary touch point", () => {
    render(<ContextMenuTriggerHarness />);
    const trigger = screen.getByTestId("trigger");

    const touchList = createTouchList(trigger, []);
    Object.assign(touchList, {
      item: () => null,
      length: 1,
    });

    act(() => {
      trigger.dispatchEvent(
        Object.assign(new Event("touchstart", { bubbles: true }), {
          touches: touchList,
          targetTouches: touchList,
          changedTouches: touchList,
        }),
      );
    });

    expect(screen.getByTestId("state-open")).toHaveTextContent("false");
  });

  it("ignores document context menu events with non-node target", () => {
    render(<ContextMenuTriggerHarness initialOpen />);
    const trigger = screen.getByTestId("trigger");

    fireEvent.contextMenu(trigger, { clientX: 10, clientY: 10 });
    expect(screen.getByTestId("state-open")).toHaveTextContent("true");

    act(() => {
      document.dispatchEvent(
        new Event("contextmenu", { bubbles: true, cancelable: true }),
      );
    });

    expect(screen.getByTestId("state-open")).toHaveTextContent("true");
  });
});
