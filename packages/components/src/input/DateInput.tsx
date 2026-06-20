import { cn } from "@dev-ui/core";
import { useDateSegment } from "@react-aria/datepicker";
import type {
  DateFieldState,
  DateSegment,
  TimeFieldState,
} from "@react-stately/datepicker";
import { useRef } from "react";
import type { DateInputProps } from "./date-input.types";
import { useDateInputContext } from "./date-input-context";
import styles from "./input.module.scss";

const normalizeSegmentWhitespace = (text: string) =>
  text.replace(/[\u00A0\u2007\u2009\u202F]/g, " ");

function DateSegmentInner({
  segment,
  state,
}: {
  segment: DateSegment;
  state: DateFieldState | TimeFieldState;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const { segmentProps } = useDateSegment(segment, state, ref);

  return (
    <span
      {...segmentProps}
      ref={ref}
      data-date-segment=""
      data-placeholder={segment.isPlaceholder ? "true" : undefined}
      data-disabled={state.isDisabled ? "true" : undefined}
      className={styles.dateSegment}
    >
      {normalizeSegmentWhitespace(segment.text)}
    </span>
  );
}

function DateInput({ size = "md", className }: DateInputProps) {
  const context = useDateInputContext("DateInput");
  const ref = useRef<HTMLDivElement>(null);
  const state = context.state;

  return (
    <div
      ref={ref}
      data-input=""
      data-date-input=""
      data-input-control=""
      data-size={size}
      data-disabled={state.isDisabled ? "true" : undefined}
      className={cn(styles.dateInput, className)}
    >
      {state.segments.map((segment) => (
        <DateSegmentInner
          key={`${segment.type}-${normalizeSegmentWhitespace(segment.text)}-${segment.isPlaceholder}`}
          segment={segment}
          state={state}
        />
      ))}
    </div>
  );
}

export type { DateInputProps } from "./date-input.types";
export { DateInput };
