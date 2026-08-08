import "@testing-library/jest-dom/vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  Drawer,
  DrawerHandle,
  DrawerIndent,
  DrawerIndentBackground,
  DrawerProvider,
  DrawerSwipeArea,
} from "../Drawer";

type DrawerPlacement = "top" | "bottom" | "left" | "right";

function getBackdrop() {
  const drawer = document.querySelector("[data-drawer]");
  return drawer
    ?.closest('[class*="overlay"]')
    ?.querySelector('[class*="backdrop"]');
}

function getDrawerPanel() {
  return document.querySelector("[data-drawer]") as HTMLElement | null;
}

function finishDrawerExit() {
  const panel = getDrawerPanel();
  if (panel) {
    act(() => {
      fireEvent.transitionEnd(panel, {
        propertyName: "transform",
        bubbles: true,
      });
    });
  }
}

function swipeDrawer(
  placement: DrawerPlacement,
  distance = 120,
  target: HTMLElement | null = getDrawerPanel(),
) {
  expect(target).toBeTruthy();

  const start = { pageX: 200, pageY: 200, clientX: 200, clientY: 200 };
  const end = { ...start };

  switch (placement) {
    case "bottom":
      end.pageY += distance;
      end.clientY += distance;
      break;
    case "top":
      end.pageY -= distance;
      end.clientY -= distance;
      break;
    case "left":
      end.pageX -= distance;
      end.clientX -= distance;
      break;
    case "right":
      end.pageX += distance;
      end.clientX += distance;
      break;
  }

  act(() => {
    fireEvent.pointerDown(target!, {
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
  });
}

describe("Drawer", () => {
  it("renders closed by default", () => {
    render(
      <Drawer defaultOpen={false}>
        <DrawerHandle />
        <p>Drawer content</p>
      </Drawer>,
    );

    expect(screen.queryByText("Drawer content")).not.toBeInTheDocument();
  });

  it("renders open content with handle", () => {
    render(
      <Drawer defaultOpen placement="bottom">
        <DrawerHandle data-testid="drawer-handle" />
        <p>Drawer content</p>
      </Drawer>,
    );

    expect(screen.getByText("Drawer content")).toBeInTheDocument();
    expect(screen.getByTestId("drawer-handle")).toHaveAttribute(
      "data-slot",
      "drawer-handle",
    );
    expect(screen.getByTestId("drawer-handle")).toHaveAttribute(
      "data-orientation",
      "horizontal",
    );
  });

  it("orients the handle for side placements", () => {
    render(
      <Drawer defaultOpen placement="left">
        <DrawerHandle data-testid="drawer-handle" />
        <p>Drawer content</p>
      </Drawer>,
    );

    expect(screen.getByTestId("drawer-handle")).toHaveAttribute(
      "data-orientation",
      "vertical",
    );
    expect(screen.getByTestId("drawer-handle")).toHaveAttribute(
      "data-placement",
      "left",
    );
  });

  it("orients the handle for top and right placements", () => {
    const { rerender } = render(
      <Drawer defaultOpen placement="top">
        <DrawerHandle data-testid="drawer-handle" />
        <p>Drawer content</p>
      </Drawer>,
    );

    expect(screen.getByTestId("drawer-handle")).toHaveAttribute(
      "data-orientation",
      "horizontal",
    );

    rerender(
      <Drawer defaultOpen placement="right">
        <DrawerHandle data-testid="drawer-handle" />
        <p>Drawer content</p>
      </Drawer>,
    );

    expect(screen.getByTestId("drawer-handle")).toHaveAttribute(
      "data-orientation",
      "vertical",
    );
    expect(screen.getByTestId("drawer-handle")).toHaveAttribute(
      "data-placement",
      "right",
    );
  });

  it("renders auxiliary drawer primitives", () => {
    render(
      <DrawerProvider>
        <Drawer defaultOpen placement="top">
          <DrawerSwipeArea data-testid="drawer-swipe-area" />
          <DrawerIndent data-testid="drawer-indent" />
          <DrawerIndentBackground data-testid="drawer-indent-background" />
          <p>Drawer content</p>
        </Drawer>
      </DrawerProvider>,
    );

    expect(screen.getByTestId("drawer-swipe-area")).toHaveAttribute(
      "data-slot",
      "drawer-swipe-area",
    );
    expect(screen.getByTestId("drawer-indent")).toBeInTheDocument();
    expect(screen.getByTestId("drawer-indent-background")).toBeInTheDocument();
  });

  it("closes when the backdrop is clicked", () => {
    render(
      <Drawer defaultOpen>
        <p>Drawer content</p>
      </Drawer>,
    );

    expect(screen.getByText("Drawer content")).toBeInTheDocument();

    const backdrop = getBackdrop();
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop!);
    finishDrawerExit();

    expect(screen.queryByText("Drawer content")).not.toBeInTheDocument();
  });

  it("closes when the dismiss button is activated", () => {
    render(
      <Drawer defaultOpen>
        <p>Drawer content</p>
      </Drawer>,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Dismiss" })[0]!);
    finishDrawerExit();

    expect(screen.queryByText("Drawer content")).not.toBeInTheDocument();
  });

  it("closes on Escape by default", () => {
    render(
      <Drawer defaultOpen>
        <p>Drawer content</p>
      </Drawer>,
    );

    act(() => {
      getDrawerPanel()?.focus();
    });
    fireEvent.keyDown(getDrawerPanel()!, { key: "Escape", code: "Escape" });
    finishDrawerExit();

    expect(screen.queryByText("Drawer content")).not.toBeInTheDocument();
  });

  it("prevents Escape from closing when keyboard dismiss is disabled", () => {
    render(
      <Drawer defaultOpen isKeyboardDismissDisabled>
        <p>Drawer content</p>
      </Drawer>,
    );

    act(() => {
      getDrawerPanel()?.focus();
    });
    fireEvent.keyDown(getDrawerPanel()!, { key: "Escape", code: "Escape" });

    expect(screen.getByText("Drawer content")).toBeInTheDocument();
  });

  it("prevents swipe dismiss when swipeToDismiss is disabled", () => {
    render(
      <Drawer defaultOpen swipeToDismiss={false}>
        <p>Drawer content</p>
      </Drawer>,
    );

    expect(
      document.querySelector('[data-swipe-disabled=""]'),
    ).toBeInTheDocument();

    swipeDrawer("bottom");

    expect(screen.getByText("Drawer content")).toBeInTheDocument();
  });

  it("dismisses on swipe for bottom placement", () => {
    render(
      <Drawer defaultOpen placement="bottom">
        <DrawerHandle data-testid="drawer-handle" />
        <p>Drawer content</p>
      </Drawer>,
    );

    swipeDrawer("bottom");
    finishDrawerExit();

    expect(screen.queryByText("Drawer content")).not.toBeInTheDocument();
  });

  it("dismisses on swipe for top placement", () => {
    render(
      <Drawer defaultOpen placement="top">
        <p>Drawer content</p>
      </Drawer>,
    );

    swipeDrawer("top");
    finishDrawerExit();

    expect(screen.queryByText("Drawer content")).not.toBeInTheDocument();
  });

  it("dismisses on swipe for left placement", () => {
    render(
      <Drawer defaultOpen placement="left">
        <p>Left drawer</p>
      </Drawer>,
    );

    swipeDrawer("left");
    finishDrawerExit();

    expect(screen.queryByText("Left drawer")).not.toBeInTheDocument();
  });

  it("dismisses on swipe for right placement", () => {
    render(
      <Drawer defaultOpen placement="right">
        <p>Right drawer</p>
      </Drawer>,
    );

    swipeDrawer("right");
    finishDrawerExit();

    expect(screen.queryByText("Right drawer")).not.toBeInTheDocument();
  });

  it("applies swipe progress styles while dragging", () => {
    render(
      <Drawer defaultOpen placement="bottom">
        <p>Drawer content</p>
      </Drawer>,
    );

    const panel = getDrawerPanel();
    expect(panel).toBeTruthy();

    act(() => {
      fireEvent.pointerDown(panel!, {
        pointerId: 1,
        button: 0,
        pointerType: "touch",
        pageX: 200,
        pageY: 200,
        clientX: 200,
        clientY: 200,
      });
      fireEvent.pointerMove(window, {
        pointerId: 1,
        pointerType: "touch",
        pageX: 200,
        pageY: 260,
        clientX: 200,
        clientY: 260,
      });
    });

    expect(panel).toHaveAttribute("data-swiping", "true");
    expect(panel?.style.getPropertyValue("--drawer-swipe-progress")).not.toBe(
      "",
    );

    act(() => {
      fireEvent.pointerUp(window, {
        pointerId: 1,
        pointerType: "touch",
        pageX: 200,
        pageY: 260,
        clientX: 200,
        clientY: 260,
      });
    });

    expect(screen.getByText("Drawer content")).toBeInTheDocument();
  });

  it("dismisses when swiping via the handle", () => {
    render(
      <Drawer defaultOpen placement="bottom">
        <DrawerHandle data-testid="drawer-handle" />
        <p>Drawer content</p>
      </Drawer>,
    );

    swipeDrawer("bottom", 120, screen.getByTestId("drawer-handle"));
    finishDrawerExit();

    expect(screen.queryByText("Drawer content")).not.toBeInTheDocument();
  });

  it("does not capture pointer events on form inputs", () => {
    render(
      <Drawer defaultOpen placement="bottom">
        <label htmlFor="referral-discount">Referral discount</label>
        <input id="referral-discount" data-testid="referral-discount" />
      </Drawer>,
    );

    const input = screen.getByTestId("referral-discount");
    const pointerDown = new MouseEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      button: 0,
      clientX: 200,
      clientY: 200,
    });
    Object.defineProperty(pointerDown, "pointerId", { value: 1 });
    Object.defineProperty(pointerDown, "pointerType", { value: "touch" });
    Object.defineProperty(pointerDown, "pageX", { value: 200 });
    Object.defineProperty(pointerDown, "pageY", { value: 200 });

    act(() => {
      input.dispatchEvent(pointerDown);
    });

    expect(pointerDown.defaultPrevented).toBe(false);
    expect(getDrawerPanel()).not.toHaveAttribute("data-swiping");

    act(() => {
      input.focus();
    });
    expect(input).toHaveFocus();
  });

  it("does not dismiss when swiping starts on a form input", () => {
    render(
      <Drawer defaultOpen placement="bottom">
        <input data-testid="studio-discount" />
      </Drawer>,
    );

    swipeDrawer("bottom", 120, screen.getByTestId("studio-discount"));
    finishDrawerExit();

    expect(screen.getByTestId("studio-discount")).toBeInTheDocument();
  });

  it("opens when controlled isOpen becomes true", () => {
    const { rerender } = render(
      <Drawer isOpen={false}>
        <p>Drawer content</p>
      </Drawer>,
    );

    expect(screen.queryByText("Drawer content")).not.toBeInTheDocument();

    rerender(
      <Drawer isOpen>
        <p>Drawer content</p>
      </Drawer>,
    );

    expect(screen.getByText("Drawer content")).toBeInTheDocument();
  });

  it("does not dismiss when isDismissable is false", () => {
    render(
      <Drawer defaultOpen isDismissable={false}>
        <p>Drawer content</p>
      </Drawer>,
    );

    expect(
      screen.queryByRole("button", { name: "Dismiss" }),
    ).not.toBeInTheDocument();

    const backdrop = getBackdrop();
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop!);

    expect(screen.getByText("Drawer content")).toBeInTheDocument();
  });

  it("renders when controlled with isOpen", () => {
    render(
      <Drawer isOpen>
        <p>Drawer content</p>
      </Drawer>,
    );

    expect(screen.getByText("Drawer content")).toBeInTheDocument();
  });

  it("calls onOpenChange when dismissed", () => {
    const onOpenChange = vi.fn();

    render(
      <Drawer defaultOpen onOpenChange={onOpenChange}>
        <p>Drawer content</p>
      </Drawer>,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Dismiss" })[0]!);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("supports string and function class names", () => {
    const { rerender } = render(
      <Drawer defaultOpen className="custom-drawer-popup">
        <p>Drawer content</p>
      </Drawer>,
    );

    expect(document.querySelector(".custom-drawer-popup")).toBeInTheDocument();

    rerender(
      <Drawer defaultOpen className={({ open }) => (open ? "open-drawer" : "")}>
        <p>Drawer content</p>
      </Drawer>,
    );

    expect(document.querySelector(".open-drawer")).toBeInTheDocument();
  });

  it("applies inline styles to the popup", () => {
    render(
      <Drawer defaultOpen style={{ maxWidth: 320 }}>
        <p>Drawer content</p>
      </Drawer>,
    );

    expect(getDrawerPanel()).toHaveStyle({ maxWidth: "320px" });
  });

  it("removes the starting style after the opening frame", async () => {
    render(
      <Drawer defaultOpen>
        <p>Drawer content</p>
      </Drawer>,
    );

    const panel = getDrawerPanel();
    expect(panel).toHaveAttribute("data-starting-style", "");

    await waitFor(() => {
      expect(panel).not.toHaveAttribute("data-starting-style");
    });
  });

  it("applies ending style while closing", async () => {
    render(
      <Drawer defaultOpen>
        <p>Drawer content</p>
      </Drawer>,
    );

    const backdrop = getBackdrop();
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop!);

    const panel = getDrawerPanel();
    expect(panel).toHaveAttribute("data-ending-style", "");
    expect(backdrop).toHaveAttribute("data-ending-style", "");

    finishDrawerExit();

    await waitFor(() => {
      expect(screen.queryByText("Drawer content")).not.toBeInTheDocument();
    });
  });

  it("focuses nested dialog content when present", async () => {
    render(
      <Drawer defaultOpen isDismissable={false}>
        <div role="dialog" tabIndex={-1} aria-label="Nested dialog">
          Drawer dialog
        </div>
      </Drawer>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("dialog", { name: "Nested dialog" }),
      ).toHaveFocus();
    });
  });

  it("opens from a parent-controlled trigger", () => {
    function ControlledDrawer() {
      const [open, setOpen] = useState(false);

      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open drawer
          </button>
          <Drawer isOpen={open} onOpenChange={setOpen}>
            <p>Drawer content</p>
          </Drawer>
        </>
      );
    }

    render(<ControlledDrawer />);

    fireEvent.click(screen.getByRole("button", { name: "Open drawer" }));

    expect(screen.getByText("Drawer content")).toBeInTheDocument();
  });

  it("ignores swipe updates when swipeToDismiss is disabled mid-gesture", () => {
    const { rerender } = render(
      <Drawer defaultOpen placement="bottom" swipeToDismiss>
        <p>Drawer content</p>
      </Drawer>,
    );

    const panel = getDrawerPanel();
    expect(panel).toBeTruthy();

    act(() => {
      fireEvent.pointerDown(panel!, {
        pointerId: 1,
        button: 0,
        pointerType: "touch",
        pageX: 200,
        pageY: 200,
        clientX: 200,
        clientY: 200,
      });
    });

    rerender(
      <Drawer defaultOpen placement="bottom" swipeToDismiss={false}>
        <p>Drawer content</p>
      </Drawer>,
    );

    act(() => {
      fireEvent.pointerMove(window, {
        pointerId: 1,
        pointerType: "touch",
        pageX: 200,
        pageY: 260,
        clientX: 200,
        clientY: 260,
      });
      fireEvent.pointerUp(window, {
        pointerId: 1,
        pointerType: "touch",
        pageX: 200,
        pageY: 260,
        clientX: 200,
        clientY: 260,
      });
    });

    expect(screen.getByText("Drawer content")).toBeInTheDocument();
  });

  it("ignores swipe end when the panel unmounts mid-gesture", () => {
    const { rerender } = render(
      <Drawer isOpen placement="bottom">
        <p>Drawer content</p>
      </Drawer>,
    );

    const panel = getDrawerPanel();
    expect(panel).toBeTruthy();

    act(() => {
      fireEvent.pointerDown(panel!, {
        pointerId: 1,
        button: 0,
        pointerType: "touch",
        pageX: 200,
        pageY: 200,
        clientX: 200,
        clientY: 200,
      });
    });

    rerender(
      <Drawer isOpen={false} placement="bottom">
        <p>Drawer content</p>
      </Drawer>,
    );
    finishDrawerExit();

    act(() => {
      fireEvent.pointerMove(window, {
        pointerId: 1,
        pointerType: "touch",
        pageX: 200,
        pageY: 260,
        clientX: 200,
        clientY: 260,
      });
      fireEvent.pointerUp(window, {
        pointerId: 1,
        pointerType: "touch",
        pageX: 200,
        pageY: 260,
        clientX: 200,
        clientY: 260,
      });
    });

    expect(screen.queryByText("Drawer content")).not.toBeInTheDocument();
  });

  it("ignores swipe gestures that start on interactive children", () => {
    const onOpenChange = vi.fn();
    render(
      <Drawer defaultOpen placement="bottom" onOpenChange={onOpenChange}>
        <button type="button">Inside action</button>
      </Drawer>,
    );

    const action = screen.getByRole("button", { name: "Inside action" });
    act(() => {
      fireEvent.pointerDown(action, {
        pointerId: 1,
        button: 0,
        pointerType: "touch",
        pageX: 200,
        pageY: 200,
        clientX: 200,
        clientY: 200,
      });
      fireEvent.pointerMove(window, {
        pointerId: 1,
        pointerType: "touch",
        pageX: 200,
        pageY: 360,
        clientX: 200,
        clientY: 360,
      });
      fireEvent.pointerUp(window, {
        pointerId: 1,
        pointerType: "touch",
        pageX: 200,
        pageY: 360,
        clientX: 200,
        clientY: 360,
      });
    });

    expect(getDrawerPanel()).toBeTruthy();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("throws when DrawerHandle is used outside Drawer", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<DrawerHandle />)).toThrow(
      "Drawer subcomponents must be used within Drawer",
    );

    consoleError.mockRestore();
  });
});
