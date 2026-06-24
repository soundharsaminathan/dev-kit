import { cn, composeRefs } from "@dev-ui/core";
import { useColorWheel } from "@react-aria/color";
import { mergeProps } from "@react-aria/utils";
import { useColorWheelState } from "@react-stately/color";
import {
  createContext,
  type DOMAttributes,
  type RefObject,
  useContext,
  useMemo,
  useRef,
} from "react";
import {
  mergeColorPickerProps,
  useColorPickerStateContext,
} from "../color-context";
import { ColorThumb } from "../color-thumb/ColorThumb";
import { ColorThumbContext } from "../color-thumb/color-thumb-context";
import styles from "./color-wheel.module.scss";
import type { ColorWheelProps, ColorWheelTrackProps } from "./types";

type ColorWheelContextValue = {
  state: ReturnType<typeof useColorWheelState>;
  trackProps: DOMAttributes<HTMLElement>;
  thumbProps: DOMAttributes<HTMLElement>;
  inputProps: React.InputHTMLAttributes<HTMLInputElement>;
  inputRef: RefObject<HTMLInputElement | null>;
  isDisabled: boolean;
};

const ColorWheelContext = createContext<ColorWheelContextValue | null>(null);

function useColorWheelCompound(component: string): ColorWheelContextValue {
  const context = useContext(ColorWheelContext);
  if (!context) {
    throw new Error(`${component} must be used within ColorWheel`);
  }
  return context;
}

function ColorWheel({
  ref,
  children,
  className,
  isDisabled,
  outerRadius = 100,
  innerRadius = 74,
  ...props
}: ColorWheelProps) {
  const pickerState = useColorPickerStateContext();
  const mergedProps = mergeColorPickerProps(props, pickerState);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const resolvedDisabled = Boolean(isDisabled);
  const wheelOptions = {
    ...mergedProps,
    outerRadius,
    innerRadius,
    ...(isDisabled !== undefined ? { isDisabled } : {}),
  };
  const state = useColorWheelState(wheelOptions);
  const { trackProps, inputProps, thumbProps } = useColorWheel(
    wheelOptions,
    state,
    inputRef,
  );

  const contextValue = useMemo(
    () => ({
      state,
      trackProps,
      thumbProps,
      inputProps,
      inputRef,
      isDisabled: resolvedDisabled,
    }),
    [state, trackProps, thumbProps, inputProps, resolvedDisabled],
  );

  return (
    <ColorWheelContext.Provider value={contextValue}>
      <div
        ref={composeRefs(rootRef, ref)}
        data-color-wheel=""
        data-disabled={resolvedDisabled ? "true" : undefined}
        className={cn(styles.root, className)}
      >
        {children ?? <ColorWheelTrack />}
      </div>
    </ColorWheelContext.Provider>
  );
}

function ColorWheelTrack({
  className,
  children,
  ...props
}: ColorWheelTrackProps) {
  const { state, trackProps, thumbProps, inputProps, inputRef, isDisabled } =
    useColorWheelCompound("ColorWheelTrack");

  const thumbColor = isDisabled
    ? undefined
    : state.getDisplayColor().toString("css");

  const thumbContextValue = useMemo(
    () => ({
      thumbProps,
      inputProps,
      inputRef,
      isDisabled,
      ...(thumbColor !== undefined ? { thumbColor } : {}),
    }),
    [thumbProps, inputProps, inputRef, isDisabled, thumbColor],
  );

  const trackStyle = (trackProps as { style?: React.CSSProperties }).style;

  return (
    <ColorThumbContext.Provider value={thumbContextValue}>
      <div
        {...props}
        data-color-wheel-track=""
        data-disabled={isDisabled ? "true" : undefined}
        className={cn(styles.track, className)}
      >
        <div
          {...mergeProps(trackProps)}
          data-color-wheel-track-inner=""
          className={styles.trackInner}
          style={{
            ...trackStyle,
            ...(isDisabled
              ? { background: "var(--color-disabled)" }
              : undefined),
          }}
        >
          {children ?? <ColorThumb />}
        </div>
      </div>
    </ColorThumbContext.Provider>
  );
}

export type { ColorWheelProps, ColorWheelTrackProps } from "./types";
export { ColorWheel, ColorWheelTrack };
