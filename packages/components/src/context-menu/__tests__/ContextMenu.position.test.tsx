import "@testing-library/jest-dom/vitest";
import { OverlayProvider } from "@dev-ui/components/popover";
import {
  OverlayProvider as AriaOverlayProvider,
  UNSAFE_PortalProvider,
} from "@react-aria/overlays";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { type CSSProperties, type ReactNode, useRef } from "react";
import { describe, expect, it } from "vitest";
import { MenuContent, MenuItem } from "../../menu/Menu";
import { ContextMenu } from "../ContextMenu";

// Showcase wraps demos in OverlayScope (UNSAFE_PortalProvider + absolute portal host).
// Context menus must escape that portal or Popover's Overlay re-anchors to the host.

const SCOPE_OFFSET = { left: 100, top: 200 };

function mockRect(element: HTMLElement, rect: Partial<DOMRect>) {
  const left = rect.left ?? 0;
  const top = rect.top ?? 0;
  const width = rect.width ?? 100;
  const height = rect.height ?? 40;

  element.getBoundingClientRect = () =>
    ({
      x: left,
      y: top,
      width,
      height,
      top,
      left,
      right: left + width,
      bottom: top + height,
      toJSON: () => ({}),
    }) as DOMRect;
}

function ShowcaseOverlayScope({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  const portalRef = useRef<HTMLDivElement>(null);

  return (
    <div
      data-testid="overlay-scope"
      style={{
        position: "relative",
        isolation: "isolate",
        ...style,
      }}
    >
      <div
        ref={portalRef}
        data-testid="portal-host"
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      />
      <OverlayProvider>
        <UNSAFE_PortalProvider getContainer={() => portalRef.current}>
          <div data-testid="overlay-root">{children}</div>
        </UNSAFE_PortalProvider>
      </OverlayProvider>
    </div>
  );
}

function renderContextMenuInScopedPortal() {
  render(
    <AriaOverlayProvider>
      <ShowcaseOverlayScope
        style={{ marginLeft: SCOPE_OFFSET.left, marginTop: SCOPE_OFFSET.top }}
      >
        <ContextMenu aria-label="Actions">
          <span>Right click me</span>
          <MenuContent>
            <MenuItem id="edit">Edit</MenuItem>
          </MenuContent>
        </ContextMenu>
      </ShowcaseOverlayScope>
    </AriaOverlayProvider>,
  );

  const trigger = document.querySelector<HTMLElement>("[data-context-menu]");
  expect(trigger).toBeTruthy();

  mockRect(trigger!, {
    left: SCOPE_OFFSET.left + 40,
    top: SCOPE_OFFSET.top + 30,
    width: 256,
    height: 128,
    right: SCOPE_OFFSET.left + 296,
    bottom: SCOPE_OFFSET.top + 158,
  });

  const portalHost = screen.getByTestId("portal-host");
  mockRect(portalHost, {
    left: SCOPE_OFFSET.left,
    top: SCOPE_OFFSET.top,
    width: 400,
    height: 300,
    right: SCOPE_OFFSET.left + 400,
    bottom: SCOPE_OFFSET.top + 300,
  });

  return trigger!;
}

function getPopoverElement() {
  return document.querySelector<HTMLElement>("[data-popover]");
}

describe("ContextMenu positioning", () => {
  it("opens the menu near the pointer inside a scoped overlay portal", async () => {
    const trigger = renderContextMenuInScopedPortal();
    const clickX = SCOPE_OFFSET.left + 80;
    const clickY = SCOPE_OFFSET.top + 60;

    fireEvent.contextMenu(trigger, { clientX: clickX, clientY: clickY });

    await waitFor(() => {
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    const popover = getPopoverElement();
    expect(popover).toBeTruthy();

    const portalHost = screen.getByTestId("portal-host");
    expect(portalHost.contains(popover!)).toBe(false);
    expect(document.body.contains(popover!)).toBe(true);
  });

  it("sets the anchor at the pointer position on open", () => {
    const trigger = renderContextMenuInScopedPortal();
    const clickX = SCOPE_OFFSET.left + 80;
    const clickY = SCOPE_OFFSET.top + 60;

    fireEvent.contextMenu(trigger, { clientX: clickX, clientY: clickY });

    const portaledAnchor = Array.from(
      document.body.querySelectorAll<HTMLElement>("span[aria-hidden='true']"),
    ).find((node) => node.style.left === `${clickX}px`);

    expect(portaledAnchor).toBeTruthy();
    expect(portaledAnchor).toHaveStyle({
      left: `${clickX}px`,
      top: `${clickY}px`,
    });
  });
});
