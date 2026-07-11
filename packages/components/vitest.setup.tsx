import { IconProvider } from "@dev-ui/icons";
import React, { type ReactElement } from "react";
import { vi } from "vitest";
import lucidePack from "../icons-packs/src/lucide/index.tsx";

const motionMock = vi.hoisted(() => {
  const { createElement, forwardRef } =
    require("react") as typeof import("react");

  type MotionProps = React.HTMLAttributes<HTMLElement> & {
    initial?: unknown;
    animate?: unknown;
    exit?: unknown;
    transition?: unknown;
    layout?: unknown;
    layoutRoot?: unknown;
  };

  function createMotionValue(initial = 0) {
    let value = initial;
    return {
      get: () => value,
      set: (next: number) => {
        value = next;
      },
      getVelocity: () => 0,
    };
  }

  function filterMotionProps({
    initial: _initial,
    animate: _animate,
    exit: _exit,
    transition: _transition,
    layout: _layout,
    layoutRoot: _layoutRoot,
    ...props
  }: MotionProps): React.HTMLAttributes<HTMLElement> {
    return props;
  }

  function createMotionComponent(tag: keyof React.JSX.IntrinsicElements) {
    return forwardRef<HTMLElement, MotionProps>(function MotionStub(
      { children, style, ...props },
      ref,
    ) {
      return createElement(
        tag,
        { ...filterMotionProps(props), ref, style },
        children,
      );
    });
  }

  const componentCache = new Map<
    string,
    ReturnType<typeof createMotionComponent>
  >();

  return {
    AnimatePresence: ({ children }: { children?: React.ReactNode }) =>
      children ?? null,
    MotionGlobalConfig: { skipAnimations: true },
    animate: () => Promise.resolve(),
    motion: new Proxy(
      {},
      {
        get: (_target, tag) => {
          const key = String(tag);
          if (!componentCache.has(key)) {
            componentCache.set(
              key,
              createMotionComponent(key as keyof React.JSX.IntrinsicElements),
            );
          }
          return componentCache.get(key);
        },
      },
    ),
    useMotionValue: (initial?: number) => createMotionValue(initial ?? 0),
    useReducedMotion: vi.fn(() => true),
  };
});

vi.mock("motion/react", () => motionMock);

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
