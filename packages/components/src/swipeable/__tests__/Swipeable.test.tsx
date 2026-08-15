import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Swipeable } from "../Swipeable";

function swipeX(
  target: HTMLElement,
  fromX: number,
  toX: number,
  pointerType = "touch",
) {
  const start = { pageX: fromX, pageY: 200, clientX: fromX, clientY: 200 };
  const end = { pageX: toX, pageY: 200, clientX: toX, clientY: 200 };

  fireEvent.pointerDown(target, {
    pointerId: 1,
    button: 0,
    pointerType,
    ...start,
  });
  fireEvent.pointerMove(window, {
    pointerId: 1,
    pointerType,
    ...end,
  });
  fireEvent.pointerUp(window, {
    pointerId: 1,
    pointerType,
    ...end,
  });
}

function getSurface(name = "Row actions") {
  return screen.getByRole("group", { name });
}

describe("Swipeable", () => {
  it("renders children and the visible fallback action menu", () => {
    render(
      <Swipeable
        ariaLabel="Row actions"
        onSwipeLeft={vi.fn()}
        fallbackActions={
          <button type="button" aria-label="Archive fallback">
            Archive
          </button>
        }
      >
        <span>Row content</span>
      </Swipeable>,
    );

    expect(screen.getByText("Row content")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Archive fallback" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Row actions" })).toHaveAttribute(
      "aria-keyshortcuts",
      "ArrowLeft ArrowRight",
    );
  });

  it("fires onSwipeLeft when a left swipe crosses the threshold", () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();

    render(
      <Swipeable
        ariaLabel="Row actions"
        onSwipeLeft={onSwipeLeft}
        onSwipeRight={onSwipeRight}
      >
        <span>Row content</span>
      </Swipeable>,
    );

    swipeX(getSurface(), 200, 100);

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it("fires onSwipeRight when a right swipe crosses the threshold", () => {
    const onSwipeRight = vi.fn();

    render(
      <Swipeable ariaLabel="Row actions" onSwipeRight={onSwipeRight}>
        <span>Row content</span>
      </Swipeable>,
    );

    swipeX(getSurface(), 200, 300);

    expect(onSwipeRight).toHaveBeenCalledTimes(1);
  });

  it("snaps open to reveal the right actions on a gentle swipe", () => {
    const onSwipeLeft = vi.fn();
    const onArchive = vi.fn();

    render(
      <Swipeable
        ariaLabel="Row actions"
        onSwipeLeft={onSwipeLeft}
        rightActions={
          <button type="button" aria-label="Archive" onClick={onArchive}>
            Archive
          </button>
        }
      >
        <span>Row content</span>
      </Swipeable>,
    );

    expect(screen.queryByRole("button", { name: "Archive" })).toBeNull();

    swipeX(getSurface(), 200, 150);

    expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument();
    expect(document.querySelector("[data-revealed='right']")).toBeTruthy();
    expect(onSwipeLeft).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    expect(onArchive).toHaveBeenCalledTimes(1);
  });

  it("closes the reveal with the Escape key", () => {
    render(
      <Swipeable
        ariaLabel="Row actions"
        rightActions={<button type="button">Archive</button>}
      >
        <span>Row content</span>
      </Swipeable>,
    );

    swipeX(getSurface(), 200, 150);
    expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument();

    fireEvent.keyDown(getSurface(), { key: "Escape" });

    expect(screen.queryByRole("button", { name: "Archive" })).toBeNull();
  });

  it("triggers onSwipeLeft from the keyboard", () => {
    const onSwipeLeft = vi.fn();

    render(
      <Swipeable ariaLabel="Row actions" onSwipeLeft={onSwipeLeft}>
        <span>Row content</span>
      </Swipeable>,
    );

    fireEvent.keyDown(getSurface(), { key: "ArrowLeft" });

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
  });

  it("reveals right actions from the keyboard when no swipe callback exists", () => {
    render(
      <Swipeable
        ariaLabel="Row actions"
        rightActions={
          <button type="button" aria-label="Archive">
            Archive
          </button>
        }
      >
        <span>Row content</span>
      </Swipeable>,
    );

    fireEvent.keyDown(getSurface(), { key: "ArrowLeft" });

    expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument();
  });

  it("starts a swipe from nested text even when a sibling button exists", () => {
    const onSwipeLeft = vi.fn();

    render(
      <Swipeable ariaLabel="Row actions" onSwipeLeft={onSwipeLeft}>
        <div>
          <p>Row content</p>
          <button type="button">Call</button>
        </div>
      </Swipeable>,
    );

    swipeX(screen.getByText("Row content"), 200, 100);

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
  });

  it("does not start a swipe from an interactive control", () => {
    const onSwipeLeft = vi.fn();

    render(
      <Swipeable
        ariaLabel="Row actions"
        onSwipeLeft={onSwipeLeft}
        rightActions={<button type="button">Archive</button>}
      >
        <button type="button">Inner button</button>
      </Swipeable>,
    );

    const inner = screen.getByRole("button", { name: "Inner button" });
    swipeX(inner, 200, 100);

    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it("reveals actions on the left edge when swiped right", () => {
    render(
      <Swipeable
        ariaLabel="Row actions"
        leftActions={<button type="button">Edit</button>}
      >
        <span>Row content</span>
      </Swipeable>,
    );

    swipeX(getSurface(), 200, 250);

    expect(document.querySelector("[data-revealed='left']")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("closes the reveal when interacting outside the row", () => {
    render(
      <Swipeable
        ariaLabel="Row actions"
        rightActions={<button type="button">Archive</button>}
      >
        <span>Row content</span>
      </Swipeable>,
    );

    swipeX(getSurface(), 200, 150);
    expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument();

    fireEvent.pointerDown(document.body, { button: 0 });
    fireEvent.click(document.body, { button: 0 });

    expect(screen.queryByRole("button", { name: "Archive" })).toBeNull();
  });

  it("fires vertical swipe callbacks", () => {
    const onSwipeUp = vi.fn();
    const onSwipeDown = vi.fn();

    render(
      <Swipeable
        direction="vertical"
        ariaLabel="Row actions"
        onSwipeUp={onSwipeUp}
        onSwipeDown={onSwipeDown}
      >
        <span>Row content</span>
      </Swipeable>,
    );

    const start = { pageX: 200, pageY: 200, clientX: 200, clientY: 200 };
    const end = { ...start, pageY: 100, clientY: 100 };

    fireEvent.pointerDown(getSurface(), {
      pointerId: 1,
      button: 0,
      pointerType: "touch",
      ...start,
    });
    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: "touch",
      ...end,
    });
    fireEvent.pointerUp(window, {
      pointerId: 1,
      pointerType: "touch",
      ...end,
    });

    expect(onSwipeUp).toHaveBeenCalledTimes(1);
    expect(onSwipeDown).not.toHaveBeenCalled();
  });
});
