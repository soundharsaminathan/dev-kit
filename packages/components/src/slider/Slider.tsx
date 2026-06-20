import { cn, composeRefs } from "@dev-ui/core";
import { useFocusRing } from "@react-aria/focus";
import { useNumberFormatter } from "@react-aria/i18n";
import { useSlider, useSliderThumb } from "@react-aria/slider";
import { mergeProps } from "@react-aria/utils";
import type { SliderState } from "@react-stately/slider";
import { useSliderState } from "@react-stately/slider";
import {
  type CSSProperties,
  createContext,
  type DOMAttributes,
  type RefObject,
  useContext,
  useMemo,
  useRef,
} from "react";
import styles from "./slider.module.scss";
import type {
  SliderControlProps,
  SliderFillProps,
  SliderOutputProps,
  SliderProps,
  SliderThumbProps,
  SliderTrackProps,
} from "./slider.types";

type SliderContextValue = {
  state: SliderState;
  trackRef: RefObject<HTMLDivElement | null>;
  trackProps: DOMAttributes<HTMLElement>;
  outputProps: DOMAttributes<HTMLElement>;
};

const SliderContext = createContext<SliderContextValue | null>(null);

function useSliderCompound(component: string): SliderContextValue {
  const context = useContext(SliderContext);
  if (!context) {
    throw new Error(`${component} must be used within Slider`);
  }
  return context;
}

function Slider({
  ref,
  children,
  className,
  orientation = "horizontal",
  ...props
}: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const numberFormatter = useNumberFormatter();
  const sliderOptions = { ...props, orientation, numberFormatter };
  const state = useSliderState(sliderOptions);
  const { groupProps, trackProps, outputProps } = useSlider(
    sliderOptions,
    state,
    trackRef,
  );
  const groupRef = useRef<HTMLDivElement>(null);

  const contextValue = useMemo(
    () => ({ state, trackRef, trackProps, outputProps }),
    [state, trackProps, outputProps],
  );

  return (
    <SliderContext.Provider value={contextValue}>
      <div
        {...groupProps}
        ref={composeRefs(groupRef, ref)}
        data-slider=""
        data-orientation={orientation}
        className={cn(styles.root, className)}
      >
        {children ?? (
          <>
            <SliderControl />
            <SliderOutput />
          </>
        )}
      </div>
    </SliderContext.Provider>
  );
}

function SliderControl({ className, children, ...props }: SliderControlProps) {
  const { state } = useSliderCompound("SliderControl");

  return (
    <div
      {...props}
      data-slider-control=""
      data-orientation={state.orientation}
      data-disabled={state.isDisabled ? "true" : undefined}
      className={cn(styles.control, className)}
    >
      {children ?? (
        <SliderTrack>
          <SliderFill />
          {state.values.map((_, index) => (
            <SliderThumb key={String(index)} index={index} />
          ))}
        </SliderTrack>
      )}
    </div>
  );
}

function SliderTrack({ className, children, ...props }: SliderTrackProps) {
  const { state, trackRef, trackProps } = useSliderCompound("SliderTrack");

  return (
    <div
      {...mergeProps(trackProps, props)}
      ref={trackRef}
      data-slider-track=""
      data-orientation={state.orientation}
      className={cn(styles.track, className)}
    >
      {children}
    </div>
  );
}

function SliderFill({ className, style, ...props }: SliderFillProps) {
  const { state } = useSliderCompound("SliderFill");
  const percents = state.values.map((_, index) => state.getThumbPercent(index));
  const minPercent = Math.min(...percents) * 100;
  const maxPercent = Math.max(...percents) * 100;

  const fillStyle: CSSProperties =
    state.orientation === "vertical"
      ? {
          bottom: `${minPercent}%`,
          height: `${maxPercent - minPercent}%`,
          ...style,
        }
      : {
          left: `${minPercent}%`,
          width: `${maxPercent - minPercent}%`,
          ...style,
        };

  return (
    <div
      data-slider-fill=""
      className={cn(styles.fill, className)}
      style={fillStyle}
      {...props}
    />
  );
}

function SliderThumb({ index = 0, className, ...props }: SliderThumbProps) {
  const { state, trackRef } = useSliderCompound("SliderThumb");
  const inputRef = useRef<HTMLInputElement>(null);
  const { thumbProps, inputProps, isDragging } = useSliderThumb(
    { index, trackRef, inputRef },
    state,
  );
  const { focusProps, isFocusVisible } = useFocusRing();
  const percent = state.getThumbPercent(index) * 100;

  const positionStyle: CSSProperties =
    state.orientation === "vertical"
      ? { bottom: `${percent}%`, left: "50%" }
      : { left: `${percent}%`, top: "50%" };

  return (
    <div
      {...thumbProps}
      data-slider-thumb=""
      data-disabled={state.isDisabled ? "true" : undefined}
      data-dragging={isDragging ? "true" : undefined}
      data-focus-visible={isFocusVisible ? "true" : undefined}
      className={cn(styles.thumb, className)}
      style={{ ...thumbProps.style, ...positionStyle }}
      {...props}
    >
      <input
        {...mergeProps(inputProps, focusProps)}
        ref={inputRef}
        className={styles.visuallyHidden}
      />
    </div>
  );
}

function SliderOutput({ className, children, ...props }: SliderOutputProps) {
  const { state, outputProps } = useSliderCompound("SliderOutput");
  const valueText = state.values
    .map((_, index) => state.getThumbValueLabel(index))
    .join(" – ");

  return (
    <output
      {...mergeProps(outputProps, props)}
      data-slider-output=""
      data-disabled={state.isDisabled ? "true" : undefined}
      className={cn(styles.output, className)}
    >
      {children ?? valueText}
    </output>
  );
}

export type {
  SliderControlProps,
  SliderFillProps,
  SliderOutputProps,
  SliderProps,
  SliderThumbProps,
  SliderTrackProps,
} from "./slider.types";
export {
  Slider,
  SliderControl,
  SliderFill,
  SliderOutput,
  SliderThumb,
  SliderTrack,
};
