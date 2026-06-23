import { cn, composeRefs } from "@dev-ui/core";
import { useMeter } from "@react-aria/meter";
import { createContext, useContext, useMemo, useRef } from "react";
import styles from "./meter.module.scss";
import type {
  MeterFillProps,
  MeterOutputProps,
  MeterProps,
  MeterTrackProps,
} from "./meter.types";

type MeterContextValue = {
  percentage: number;
  valueText: string | undefined;
};

const MeterContext = createContext<MeterContextValue | null>(null);

function useMeterContext(component: string): MeterContextValue {
  const context = useContext(MeterContext);
  if (!context) {
    throw new Error(`${component} must be used within Meter`);
  }
  return context;
}

function getPercentage(
  value: number | undefined,
  minValue: number,
  maxValue: number,
): number {
  if (value == null) {
    return 0;
  }
  const span = maxValue - minValue;
  if (span <= 0) {
    return 0;
  }
  return ((value - minValue) / span) * 100;
}

function Meter({
  ref,
  children,
  className,
  value = 0,
  minValue = 0,
  maxValue = 100,
  ...props
}: MeterProps) {
  const domRef = useRef<HTMLDivElement>(null);
  const { meterProps } = useMeter({
    ...props,
    value,
    minValue,
    maxValue,
  } as Parameters<typeof useMeter>[0]);

  const percentage = getPercentage(value, minValue, maxValue);
  const valueText = meterProps["aria-valuetext"] as string | undefined;

  const contextValue = useMemo(
    () => ({
      percentage,
      valueText,
    }),
    [percentage, valueText],
  );

  return (
    <MeterContext.Provider value={contextValue}>
      <div
        {...meterProps}
        ref={composeRefs(domRef, ref)}
        data-meter=""
        className={cn(styles.root, className)}
      >
        {children ?? <MeterTrack />}
      </div>
    </MeterContext.Provider>
  );
}

function MeterTrack({ children, className, ...props }: MeterTrackProps) {
  return (
    <div className={cn(styles.track, className)} {...props}>
      {children ?? <MeterFill />}
    </div>
  );
}

function MeterFill({ className, style, ...props }: MeterFillProps) {
  const { percentage } = useMeterContext("MeterFill");

  return (
    <div
      data-meter-fill=""
      className={cn(styles.fill, className)}
      style={{
        width: `${percentage}%`,
        ...style,
      }}
      {...props}
    />
  );
}

function MeterOutput({ className, children, ...props }: MeterOutputProps) {
  const { valueText } = useMeterContext("MeterOutput");

  return (
    <span className={cn(styles.output, className)} {...props}>
      {children ?? valueText}
    </span>
  );
}

export type {
  MeterFillProps,
  MeterOutputProps,
  MeterProps,
  MeterTrackProps,
} from "./meter.types";
export { Meter, MeterFill, MeterOutput, MeterTrack };
