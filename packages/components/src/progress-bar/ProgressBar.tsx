import { cn, composeRefs } from "@dev-ui/core";
import { useProgressBar } from "@react-aria/progress";
import { createContext, useContext, useMemo, useRef } from "react";
import styles from "./progress-bar.module.scss";
import type {
  ProgressBarFillProps,
  ProgressBarOutputProps,
  ProgressBarProps,
  ProgressBarTrackProps,
} from "./progress-bar.types";

type ProgressBarContextValue = {
  isIndeterminate: boolean;
  percentage: number | undefined;
  valueText: string | undefined;
};

const ProgressBarContext = createContext<ProgressBarContextValue | null>(null);

function useProgressBarContext(component: string): ProgressBarContextValue {
  const context = useContext(ProgressBarContext);
  if (!context) {
    throw new Error(`${component} must be used within ProgressBar`);
  }
  return context;
}

function getPercentage(
  value: number | undefined,
  minValue: number,
  maxValue: number,
): number | undefined {
  if (value == null) {
    return undefined;
  }
  const span = maxValue - minValue;
  if (span <= 0) {
    return 0;
  }
  return ((value - minValue) / span) * 100;
}

function ProgressBar({
  ref,
  children,
  className,
  value,
  minValue = 0,
  maxValue = 100,
  isIndeterminate,
  ...props
}: ProgressBarProps) {
  const domRef = useRef<HTMLDivElement>(null);
  const { progressBarProps } = useProgressBar({
    ...props,
    value,
    minValue,
    maxValue,
    isIndeterminate,
  } as Parameters<typeof useProgressBar>[0]);

  const percentage = getPercentage(value, minValue, maxValue);
  const valueText =
    value != null && !isIndeterminate
      ? `${Math.round(percentage ?? 0)}%`
      : undefined;

  const contextValue = useMemo(
    () => ({
      isIndeterminate: Boolean(isIndeterminate),
      percentage,
      valueText,
    }),
    [isIndeterminate, percentage, valueText],
  );

  return (
    <ProgressBarContext.Provider value={contextValue}>
      <div
        {...progressBarProps}
        ref={composeRefs(domRef, ref)}
        className={cn(styles.root, className)}
      >
        {children ?? <ProgressBarTrack />}
      </div>
    </ProgressBarContext.Provider>
  );
}

function ProgressBarTrack({
  children,
  className,
  ...props
}: ProgressBarTrackProps) {
  return (
    <div className={cn(styles.track, className)} {...props}>
      {children ?? <ProgressBarFill />}
    </div>
  );
}

function ProgressBarFill({ className, style, ...props }: ProgressBarFillProps) {
  const { isIndeterminate, percentage } =
    useProgressBarContext("ProgressBarFill");

  return (
    <div
      data-indeterminate={isIndeterminate ? "true" : undefined}
      className={cn(styles.fill, className)}
      style={{
        width:
          !isIndeterminate && typeof percentage === "number"
            ? `${percentage}%`
            : undefined,
        ...style,
      }}
      {...props}
    />
  );
}

function ProgressBarOutput({
  className,
  children,
  ...props
}: ProgressBarOutputProps) {
  const { valueText } = useProgressBarContext("ProgressBarOutput");

  return (
    <span className={cn(styles.output, className)} {...props}>
      {children ?? valueText}
    </span>
  );
}

const ProgressBarControl = ProgressBarTrack;

export type {
  ProgressBarFillProps,
  ProgressBarOutputProps,
  ProgressBarProps,
  ProgressBarTrackProps,
} from "./progress-bar.types";
export {
  ProgressBar,
  ProgressBarControl,
  ProgressBarFill,
  ProgressBarOutput,
  ProgressBarTrack,
};
