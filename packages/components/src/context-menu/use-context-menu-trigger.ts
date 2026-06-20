import { mergeProps } from "@react-aria/utils";
import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type MouseEvent,
  type MouseEventHandler,
  type RefObject,
  type TouchEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const LONG_PRESS_DELAY = 500;
const TOUCH_MOVE_THRESHOLD = 10;
export const CONTEXT_MENU_OPEN_EVENT = "context-menu-open";

interface ContextMenuTriggerState {
  isOpen: boolean;
  open: (focusStrategy?: "first" | "last" | null) => void;
  close: () => void;
}

interface ContextMenuAnchor {
  x: number;
  y: number;
  size: number;
  key: number;
}

interface UseContextMenuTriggerProps {
  state: ContextMenuTriggerState;
  isDisabled?: boolean | undefined;
  onContextMenu?: MouseEventHandler<HTMLDivElement> | undefined;
  triggerProps?: Omit<ComponentPropsWithoutRef<"div">, "onContextMenu">;
}

interface ContextMenuOpenEventDetail {
  x: number;
  y: number;
  size?: number | undefined;
}

function isNode(value: EventTarget | null): value is Node {
  return value instanceof Node;
}

function containsPoint(element: HTMLElement, x: number, y: number) {
  const rect = element.getBoundingClientRect();
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function findContextMenuTriggerAtPoint(doc: Document, x: number, y: number) {
  const triggers = Array.from(
    doc.querySelectorAll<HTMLElement>("[data-context-menu]"),
  ).filter((trigger) => containsPoint(trigger, x, y));

  return triggers.sort((a, b) => {
    const aRect = a.getBoundingClientRect();
    const bRect = b.getBoundingClientRect();
    return aRect.width * aRect.height - bRect.width * bRect.height;
  })[0];
}

interface UseContextMenuTriggerResult {
  anchor: ContextMenuAnchor;
  anchorRef: RefObject<HTMLSpanElement | null>;
  anchorRefCallback: (element: HTMLSpanElement | null) => void;
  menuRef: RefObject<HTMLDivElement | null>;
  triggerProps: ComponentPropsWithoutRef<"div">;
  triggerRef: RefObject<HTMLDivElement | null>;
}

function useContextMenuTrigger({
  state,
  isDisabled = false,
  onContextMenu,
  triggerProps,
}: UseContextMenuTriggerProps): UseContextMenuTriggerResult {
  const triggerRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const anchorPositionRef = useRef<ContextMenuAnchor>({
    x: 0,
    y: 0,
    size: 0,
    key: 0,
  });
  const menuRef = useRef<HTMLDivElement>(null);
  const [, rerenderAfterAnchorMount] = useState(0);
  const touchPositionRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const allowMouseUpTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const allowMouseUpRef = useRef(false);
  const [anchor, setAnchor] = useState<ContextMenuAnchor>({
    x: 0,
    y: 0,
    size: 0,
    key: 0,
  });

  const clearLongPressTimeout = useCallback(() => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }, []);

  const clearAllowMouseUpTimeout = useCallback(() => {
    if (allowMouseUpTimeoutRef.current) {
      clearTimeout(allowMouseUpTimeoutRef.current);
      allowMouseUpTimeoutRef.current = null;
    }
  }, []);

  const openAtPoint = useCallback(
    (x: number, y: number, size = 0) => {
      setAnchor((currentAnchor) => {
        const nextAnchor = {
          x,
          y,
          size,
          key: currentAnchor.key + 1,
        };
        anchorPositionRef.current = nextAnchor;
        return nextAnchor;
      });
      allowMouseUpRef.current = false;
      state.open("first");

      clearAllowMouseUpTimeout();
      allowMouseUpTimeoutRef.current = setTimeout(() => {
        allowMouseUpRef.current = true;
      }, LONG_PRESS_DELAY);
    },
    [clearAllowMouseUpTimeout, state],
  );

  const anchorRefCallback = useCallback((element: HTMLSpanElement | null) => {
    anchorRef.current = element;
    if (element) {
      element.getBoundingClientRect = () => {
        const { x, y, size } = anchorPositionRef.current;
        return DOMRect.fromRect({ x, y, width: size, height: size });
      };
      rerenderAfterAnchorMount((version) => version + 1);
    }
  }, []);

  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger || isDisabled) {
      return;
    }

    function handleContextMenuOpen(event: Event) {
      const {
        x,
        y,
        size = 0,
      } = (event as CustomEvent<ContextMenuOpenEventDetail>).detail;
      openAtPoint(x, y, size);
    }

    trigger.addEventListener(CONTEXT_MENU_OPEN_EVENT, handleContextMenuOpen);

    return () => {
      trigger.removeEventListener(
        CONTEXT_MENU_OPEN_EVENT,
        handleContextMenuOpen,
      );
    };
  }, [isDisabled, openAtPoint]);

  useEffect(() => {
    if (isDisabled) {
      return;
    }

    const doc = triggerRef.current?.ownerDocument ?? document;

    function handleDocumentContextMenu(event: Event) {
      const mouseEvent = event as globalThis.MouseEvent;
      const target = mouseEvent.target;

      if (!isNode(target)) {
        return;
      }

      if (triggerRef.current?.contains(target)) {
        return;
      }

      if (target instanceof Element && target.closest("[data-popover]")) {
        event.preventDefault();
        return;
      }

      if (state.isOpen) {
        const contextMenuTrigger = findContextMenuTriggerAtPoint(
          doc,
          mouseEvent.clientX,
          mouseEvent.clientY,
        );

        if (contextMenuTrigger?.hasAttribute("data-disabled")) {
          state.close();
          return;
        }

        event.preventDefault();

        if (contextMenuTrigger === triggerRef.current) {
          openAtPoint(mouseEvent.clientX, mouseEvent.clientY);
          return;
        }

        if (contextMenuTrigger) {
          state.close();
          contextMenuTrigger.dispatchEvent(
            new CustomEvent<ContextMenuOpenEventDetail>(
              CONTEXT_MENU_OPEN_EVENT,
              {
                bubbles: false,
                detail: { x: mouseEvent.clientX, y: mouseEvent.clientY },
              },
            ),
          );
        }
      }
    }

    doc.addEventListener("contextmenu", handleDocumentContextMenu, true);

    return () => {
      doc.removeEventListener("contextmenu", handleDocumentContextMenu, true);
    };
  }, [isDisabled, openAtPoint, state.close, state.isOpen]);

  useEffect(() => {
    return () => {
      clearLongPressTimeout();
      clearAllowMouseUpTimeout();
    };
  }, [clearAllowMouseUpTimeout, clearLongPressTimeout]);

  const mergedTriggerProps = mergeProps(triggerProps, {
    onContextMenu(event: MouseEvent<HTMLDivElement>) {
      onContextMenu?.(event);
      if (event.defaultPrevented || isDisabled) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      openAtPoint(event.clientX, event.clientY);

      const doc = event.currentTarget.ownerDocument;
      doc.addEventListener(
        "mouseup",
        (mouseEvent) => {
          if (!allowMouseUpRef.current) {
            mouseEvent.preventDefault();
            mouseEvent.stopPropagation();
            return;
          }

          clearAllowMouseUpTimeout();
          allowMouseUpRef.current = false;

          const mouseTarget = mouseEvent.target;
          if (!isNode(mouseTarget)) {
            return;
          }

          if (
            menuRef.current?.contains(mouseTarget) ||
            triggerRef.current?.contains(mouseTarget)
          ) {
            return;
          }

          state.close();
        },
        { capture: true, once: true },
      );
    },
    onTouchStart(event: TouchEvent<HTMLDivElement>) {
      if (isDisabled || event.touches.length !== 1) {
        return;
      }

      event.stopPropagation();
      const touch = event.touches.item(0);
      if (!touch) {
        return;
      }

      touchPositionRef.current = { x: touch.clientX, y: touch.clientY };
      clearLongPressTimeout();
      longPressTimeoutRef.current = setTimeout(() => {
        const touchPosition = touchPositionRef.current;
        if (touchPosition) {
          openAtPoint(touchPosition.x, touchPosition.y, 10);
        }
      }, LONG_PRESS_DELAY);
    },
    onTouchMove(event: TouchEvent<HTMLDivElement>) {
      if (
        !longPressTimeoutRef.current ||
        !touchPositionRef.current ||
        event.touches.length !== 1
      ) {
        return;
      }

      const touch = event.touches.item(0);
      if (!touch) {
        return;
      }

      const deltaX = Math.abs(touch.clientX - touchPositionRef.current.x);
      const deltaY = Math.abs(touch.clientY - touchPositionRef.current.y);

      if (deltaX > TOUCH_MOVE_THRESHOLD || deltaY > TOUCH_MOVE_THRESHOLD) {
        clearLongPressTimeout();
      }
    },
    onTouchEnd() {
      clearLongPressTimeout();
      touchPositionRef.current = null;
    },
    onTouchCancel() {
      clearLongPressTimeout();
      touchPositionRef.current = null;
    },
    style: {
      ...(triggerProps?.style ?? {}),
      WebkitTouchCallout: "none",
    } as CSSProperties,
  });

  return {
    anchor,
    anchorRef: anchorRef as RefObject<HTMLSpanElement>,
    anchorRefCallback,
    menuRef,
    triggerProps: mergedTriggerProps,
    triggerRef,
  };
}

export { useContextMenuTrigger };
