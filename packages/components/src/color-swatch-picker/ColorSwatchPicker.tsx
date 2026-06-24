import { cn } from "@dev-ui/core";
import { mergeProps } from "@react-aria/utils";
import {
  type Color,
  parseColor,
  useColorPickerState,
} from "@react-stately/color";
import {
  createContext,
  type KeyboardEvent,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { ColorPickerStateContext } from "../color-context";
import styles from "./color-swatch-picker.module.scss";
import { PickerColorSwatch } from "./PickerColorSwatch";
import type {
  ColorSwatchPickerItemProps,
  ColorSwatchPickerProps,
} from "./types";

type ColorSwatchPickerContextValue = {
  isDisabled: boolean;
  isSelected: (color: Color) => boolean;
  selectColor: (color: Color) => void;
};

const ColorSwatchPickerContext =
  createContext<ColorSwatchPickerContextValue | null>(null);

const ARROW_KEY_DELTA: Record<string, number> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

function useColorSwatchPickerContext(
  component: string,
): ColorSwatchPickerContextValue {
  const context = useContext(ColorSwatchPickerContext);
  if (!context) {
    throw new Error(`${component} must be used within ColorSwatchPicker`);
  }
  return context;
}

function ColorSwatchPicker({
  children,
  className,
  isDisabled = false,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  ...props
}: ColorSwatchPickerProps) {
  const state = useColorPickerState(props);

  const contextValue = useMemo(
    () => ({
      isDisabled: Boolean(isDisabled),
      isSelected: (color: Color) =>
        state.color.toString("hexa") === color.toString("hexa"),
      selectColor: (color: Color) => {
        if (!isDisabled) {
          state.setColor(color);
        }
      },
    }),
    [isDisabled, state],
  );

  const handleGroupKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const delta = ARROW_KEY_DELTA[event.key];
      if (!delta || isDisabled) {
        return;
      }

      const items = [
        ...event.currentTarget.querySelectorAll<HTMLElement>(
          '[data-color-swatch-picker-item]:not([data-disabled="true"])',
        ),
      ];
      const currentIndex = items.findIndex(
        (item) => item.getAttribute("aria-checked") === "true",
      );
      if (currentIndex === -1 || items.length === 0) {
        return;
      }

      event.preventDefault();
      const nextIndex = (currentIndex + delta + items.length) % items.length;
      const nextItem = items[nextIndex];
      const nextColor = nextItem?.dataset.colorValue;
      if (!nextColor) {
        return;
      }

      state.setColor(parseColor(nextColor));
      nextItem.focus();
    },
    [isDisabled, state],
  );

  return (
    <ColorPickerStateContext.Provider value={state}>
      <ColorSwatchPickerContext.Provider value={contextValue}>
        <div
          role="radiogroup"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledby}
          data-color-swatch-picker=""
          data-disabled={isDisabled ? "true" : undefined}
          className={cn(styles.root, className)}
          onKeyDown={handleGroupKeyDown}
        >
          {children}
        </div>
      </ColorSwatchPickerContext.Provider>
    </ColorPickerStateContext.Provider>
  );
}

function ColorSwatchPickerItem({
  color,
  className,
  children,
  onClick,
  onKeyDown,
  ...props
}: ColorSwatchPickerItemProps) {
  const { isDisabled, isSelected, selectColor } = useColorSwatchPickerContext(
    "ColorSwatchPickerItem",
  );
  const parsedColor = useMemo(
    () => (typeof color === "string" ? parseColor(color) : color),
    [color],
  );
  const selected = isSelected(parsedColor);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || isDisabled) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectColor(parsedColor);
    }
  };

  return (
    <div
      {...mergeProps(props, {
        role: "radio",
        "aria-checked": selected,
        tabIndex: selected ? 0 : -1,
        onClick: (event: React.MouseEvent<HTMLDivElement>) => {
          onClick?.(event);
          if (!event.defaultPrevented && !isDisabled) {
            selectColor(parsedColor);
          }
        },
        onKeyDown: handleKeyDown,
      })}
      data-color-swatch-picker-item=""
      data-color-value={parsedColor.toString("hex")}
      data-selected={selected ? "true" : undefined}
      data-disabled={isDisabled ? "true" : undefined}
      className={cn(styles.item, className)}
    >
      {children ?? <PickerColorSwatch color={parsedColor} />}
    </div>
  );
}

const CompoundColorSwatchPicker = Object.assign(ColorSwatchPicker, {
  Item: ColorSwatchPickerItem,
});

export type {
  ColorSwatchPickerItemProps,
  ColorSwatchPickerProps,
} from "./types";
export { ColorSwatchPicker, ColorSwatchPickerItem, CompoundColorSwatchPicker };
