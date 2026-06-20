import { cn, composeRefs } from "@dev-ui/core";
import { useColorSlider } from "@react-aria/color";
import { useLocale } from "@react-aria/i18n";
import { mergeProps } from "@react-aria/utils";
import { useColorSliderState } from "@react-stately/color";
import {
  type CSSProperties,
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
import styles from "./color-slider.module.scss";
import type {
  ColorSliderControlProps,
  ColorSliderOutputProps,
  ColorSliderProps,
} from "./types";

type ColorSliderContextValue = {
  state: ReturnType<typeof useColorSliderState>;
  trackRef: RefObject<HTMLDivElement | null>;
  trackProps: DOMAttributes<HTMLElement>;
  thumbProps: DOMAttributes<HTMLElement>;
  inputProps: React.InputHTMLAttributes<HTMLInputElement>;
  outputProps: DOMAttributes<HTMLElement>;
  inputRef: RefObject<HTMLInputElement | null>;
  isDisabled: boolean;
};

const ColorSliderContext = createContext<ColorSliderContextValue | null>(null);

function useColorSliderCompound(component: string): ColorSliderContextValue {
  const context = useContext(ColorSliderContext);
  if (!context) {
    throw new Error(`${component} must be used within ColorSlider`);
  }
  return context;
}

function ColorSlider({
  ref,
  children,
  className,
  orientation = "horizontal",
  isDisabled,
  ...props
}: ColorSliderProps) {
  const pickerState = useColorPickerStateContext();
  const mergedProps = mergeColorPickerProps(props, pickerState);
  const { locale } = useLocale();
  const trackRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const resolvedDisabled = Boolean(isDisabled);
  const sliderOptions = {
    ...mergedProps,
    orientation,
    locale,
    ...(isDisabled !== undefined ? { isDisabled } : {}),
  };
  const state = useColorSliderState(sliderOptions);
  const { trackProps, thumbProps, inputProps, outputProps } = useColorSlider(
    {
      ...sliderOptions,
      trackRef,
      inputRef,
    },
    state,
  );

  const contextValue = useMemo(
    () => ({
      state,
      trackRef,
      trackProps,
      thumbProps,
      inputProps,
      outputProps,
      inputRef,
      isDisabled: resolvedDisabled,
    }),
    [state, trackProps, thumbProps, inputProps, outputProps, resolvedDisabled],
  );

  return (
    <ColorSliderContext.Provider value={contextValue}>
      <div
        ref={composeRefs(rootRef, ref)}
        data-color-slider=""
        data-orientation={orientation}
        className={cn(styles.root, className)}
      >
        {children ?? (
          <>
            <ColorSliderControl />
            <ColorSliderOutput />
          </>
        )}
      </div>
    </ColorSliderContext.Provider>
  );
}

function ColorSliderControl({
  className,
  children,
  ...props
}: ColorSliderControlProps) {
  const {
    state,
    trackRef,
    trackProps,
    thumbProps,
    inputProps,
    inputRef,
    isDisabled,
  } = useColorSliderCompound("ColorSliderControl");

  const thumbColor = isDisabled
    ? undefined
    : state.getDisplayColor().toString("css");

  const thumbContextValue = useMemo(
    () => ({
      thumbProps,
      inputProps,
      inputRef,
      isDisabled,
      orientation: state.orientation,
      ...(thumbColor !== undefined ? { thumbColor } : {}),
    }),
    [thumbProps, inputProps, inputRef, isDisabled, state, thumbColor],
  );

  const trackStyle = (trackProps as { style?: CSSProperties }).style;

  return (
    <ColorThumbContext.Provider value={thumbContextValue}>
      <div
        {...props}
        data-color-slider-control=""
        data-orientation={state.orientation}
        data-disabled={isDisabled ? "true" : undefined}
        className={cn(styles.control, className)}
      >
        <div
          {...mergeProps(trackProps, { ref: trackRef })}
          data-color-slider-track=""
          data-orientation={state.orientation}
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

function ColorSliderOutput({
  className,
  children,
  ...props
}: ColorSliderOutputProps) {
  const { state, outputProps, isDisabled } =
    useColorSliderCompound("ColorSliderOutput");

  return (
    <output
      {...mergeProps(outputProps, props)}
      data-color-slider-output=""
      data-disabled={isDisabled ? "true" : undefined}
      className={cn(styles.output, className)}
    >
      {children ?? state.getDisplayColor().toString("hex")}
    </output>
  );
}

export type {
  ColorSliderControlProps,
  ColorSliderOutputProps,
  ColorSliderProps,
} from "./types";
export { ColorSlider, ColorSliderControl, ColorSliderOutput };
