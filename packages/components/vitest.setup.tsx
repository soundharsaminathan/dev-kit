import { IconProvider } from "@dev-ui/icons";
import React, {
  type ComponentPropsWithoutRef,
  type ElementType,
  forwardRef,
  type ReactElement,
  type ReactNode,
} from "react";
import { vi } from "vitest";
import lucidePack from "../icons-packs/src/lucide/index.tsx";

vi.mock("motion/react", () => {
  function createMotionComponent(tag: ElementType) {
    return forwardRef<HTMLElement, ComponentPropsWithoutRef<"div">>(
      ({ children, ...props }, ref) => {
        const {
          layoutId: _layoutId,
          layoutRoot: _layoutRoot,
          layout: _layout,
          initial: _initial,
          animate: _animate,
          exit: _exit,
          transition: _transition,
          whileHover: _whileHover,
          whileTap: _whileTap,
          ...rest
        } = props as ComponentPropsWithoutRef<"div"> & {
          layoutId?: unknown;
          layoutRoot?: unknown;
          layout?: unknown;
          initial?: unknown;
          animate?: unknown;
          exit?: unknown;
          transition?: unknown;
          whileHover?: unknown;
          whileTap?: unknown;
        };
        return React.createElement(tag, { ...rest, ref }, children);
      },
    );
  }

  return {
    motion: {
      div: createMotionComponent("div"),
      span: createMotionComponent("span"),
    },
    MotionConfig: ({ children }: { children?: ReactNode }) => children,
    useReducedMotion: () => false,
    AnimatePresence: ({
      children,
      onExitComplete,
    }: {
      children?: ReactNode;
      onExitComplete?: () => void;
    }) => {
      const childCount = React.Children.count(children);
      const prevCountRef = React.useRef(childCount);
      React.useEffect(() => {
        if (childCount < prevCountRef.current) {
          onExitComplete?.();
        }
        prevCountRef.current = childCount;
      }, [childCount, onExitComplete]);
      return children;
    },
  };
});

vi.mock("@testing-library/react", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@testing-library/react")>();

  return {
    ...actual,
    render: (ui: ReactElement, options?: Parameters<typeof actual.render>[1]) =>
      actual.render(
        <IconProvider icons={{ library: "lucide" }} initialPack={lucidePack}>
          {ui}
        </IconProvider>,
        options,
      ),
  };
});
