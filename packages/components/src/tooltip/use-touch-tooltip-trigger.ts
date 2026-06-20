import { useLongPress } from "@react-aria/interactions";
import { mergeProps } from "@react-aria/utils";
import type { TooltipTriggerState } from "@react-stately/tooltip";
import type { DOMAttributes } from "@react-types/shared";
import { useMemo } from "react";
import type { TouchBehavior } from "./tooltip.types";

export function useTouchTooltipTriggerProps(
  ariaTriggerProps: DOMAttributes,
  state: TooltipTriggerState,
  canHover: boolean,
  touchBehavior: TouchBehavior,
) {
  const { longPressProps } = useLongPress({
    isDisabled: canHover || touchBehavior !== "longPress",
    onLongPress: () => {
      state.open(false);
    },
  });

  return useMemo(() => {
    if (canHover) {
      return ariaTriggerProps;
    }

    const { onPointerDown, onKeyDown, ...rest } = ariaTriggerProps;

    if (touchBehavior === "longPress") {
      return mergeProps(rest, longPressProps, {
        onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
          if (e.pointerType === "touch" || e.pointerType === "pen") {
            return;
          }
          onPointerDown?.(e);
        },
      });
    }

    return mergeProps(rest, {
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
        if (e.pointerType === "touch" || e.pointerType === "pen") {
          return;
        }
        onPointerDown?.(e);
      },
      onClick: (e: React.MouseEvent<HTMLElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (state.isOpen) {
          state.close(true);
        } else {
          state.open(false);
        }
      },
      onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
        onKeyDown?.(e);
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (state.isOpen) {
            state.close(true);
          } else {
            state.open(false);
          }
        }
      },
    });
  }, [ariaTriggerProps, canHover, longPressProps, state, touchBehavior]);
}
