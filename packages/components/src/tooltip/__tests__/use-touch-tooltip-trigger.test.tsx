import "@testing-library/jest-dom/vitest";
import { useTooltipTriggerState } from "@react-stately/tooltip";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TouchBehavior } from "../tooltip.types";
import { useTouchTooltipTriggerProps } from "../use-touch-tooltip-trigger";

function TouchTriggerHarness({
  canHover = false,
  touchBehavior = "toggle",
}: {
  canHover?: boolean;
  touchBehavior?: TouchBehavior;
}) {
  const state = useTooltipTriggerState({ delay: 0 });
  const onPointerDown = vi.fn();
  const onKeyDown = vi.fn();
  const triggerProps = useTouchTooltipTriggerProps(
    { onPointerDown, onKeyDown },
    state,
    canHover,
    touchBehavior,
  );

  return (
    <>
      <button type="button" {...triggerProps} data-testid="trigger">
        Trigger
      </button>
      <div data-testid="open">{String(state.isOpen)}</div>
    </>
  );
}

function dispatchPointerDown(
  target: Element,
  pointerType: "mouse" | "touch" | "pen",
) {
  const event = new Event("pointerdown", {
    bubbles: true,
    cancelable: true,
  }) as PointerEvent;

  Object.defineProperty(event, "pointerType", { value: pointerType });
  Object.defineProperty(event, "pointerId", { value: 1 });

  act(() => {
    target.dispatchEvent(event);
  });
}

describe("useTouchTooltipTriggerProps", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns aria trigger props unchanged when hover is available", () => {
    render(<TouchTriggerHarness canHover touchBehavior="toggle" />);

    fireEvent.click(screen.getByTestId("trigger"));

    expect(screen.getByTestId("open")).toHaveTextContent("false");
  });

  it("toggles the tooltip on click when hover is unavailable", () => {
    render(<TouchTriggerHarness touchBehavior="toggle" />);
    const trigger = screen.getByTestId("trigger");

    fireEvent.click(trigger);
    expect(screen.getByTestId("open")).toHaveTextContent("true");

    fireEvent.click(trigger);
    expect(screen.getByTestId("open")).toHaveTextContent("false");
  });

  it("toggles the tooltip with Enter and Space", () => {
    render(<TouchTriggerHarness touchBehavior="toggle" />);
    const trigger = screen.getByTestId("trigger");

    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(screen.getByTestId("open")).toHaveTextContent("true");

    fireEvent.keyDown(trigger, { key: " " });
    expect(screen.getByTestId("open")).toHaveTextContent("false");
  });

  it("ignores touch and pen pointer down events in toggle mode", () => {
    render(<TouchTriggerHarness touchBehavior="toggle" />);
    const trigger = screen.getByTestId("trigger");

    dispatchPointerDown(trigger, "touch");
    dispatchPointerDown(trigger, "pen");

    expect(screen.getByTestId("open")).toHaveTextContent("false");
  });

  it("forwards mouse pointer down events in toggle mode", () => {
    const onPointerDown = vi.fn();
    function Harness() {
      const state = useTooltipTriggerState({ delay: 0 });
      const triggerProps = useTouchTooltipTriggerProps(
        { onPointerDown },
        state,
        false,
        "toggle",
      );

      return <button type="button" {...triggerProps} data-testid="trigger" />;
    }

    render(<Harness />);
    dispatchPointerDown(screen.getByTestId("trigger"), "mouse");

    expect(onPointerDown).toHaveBeenCalled();
  });

  it("opens on long press when configured", () => {
    render(<TouchTriggerHarness touchBehavior="longPress" />);
    const trigger = screen.getByTestId("trigger");

    fireEvent.pointerDown(trigger, { pointerType: "touch", pointerId: 1 });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByTestId("open")).toHaveTextContent("true");
  });

  it("forwards mouse pointer down events in long press mode", () => {
    const onPointerDown = vi.fn();
    function Harness() {
      const state = useTooltipTriggerState({ delay: 0 });
      const triggerProps = useTouchTooltipTriggerProps(
        { onPointerDown },
        state,
        false,
        "longPress",
      );

      return <button type="button" {...triggerProps} data-testid="trigger" />;
    }

    render(<Harness />);
    dispatchPointerDown(screen.getByTestId("trigger"), "mouse");

    expect(onPointerDown).toHaveBeenCalled();
  });

  it("ignores touch pointer down events in long press mode", () => {
    const onPointerDown = vi.fn();
    function Harness() {
      const state = useTooltipTriggerState({ delay: 0 });
      const triggerProps = useTouchTooltipTriggerProps(
        { onPointerDown },
        state,
        false,
        "longPress",
      );

      return <button type="button" {...triggerProps} data-testid="trigger" />;
    }

    render(<Harness />);
    dispatchPointerDown(screen.getByTestId("trigger"), "touch");

    expect(onPointerDown).not.toHaveBeenCalled();
  });
});
