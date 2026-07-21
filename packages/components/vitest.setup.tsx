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
          initial: _initial,
          animate: _animate,
          exit: _exit,
          transition: _transition,
          ...rest
        } = props as ComponentPropsWithoutRef<"div"> & {
          layoutId?: string;
          layoutRoot?: boolean;
          initial?: unknown;
          animate?: unknown;
          exit?: unknown;
          transition?: unknown;
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
    AnimatePresence: ({ children }: { children?: ReactNode }) => children,
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
