import { cn, composeRefs } from "@dev-ui/core";
import { useTimeField } from "@react-aria/datepicker";
import { useLocale } from "@react-aria/i18n";
import { mergeProps } from "@react-aria/utils";
import { type TimeValue, useTimeFieldState } from "@react-stately/datepicker";
import {
  Children,
  cloneElement,
  createContext,
  type HTMLAttributes,
  isValidElement,
  type ReactNode,
  useContext,
  useMemo,
  useRef,
} from "react";
import { Field } from "../field/Field";
import { useFieldContext, useFieldInputAria } from "../field/field-context";
import { DateInput } from "../input/DateInput";
import { DateInputContext } from "../input/date-input-context";
import styles from "./time-field.module.scss";
import type { TimeFieldContextValue, TimeFieldProps } from "./types";

const TimeFieldContext = createContext<TimeFieldContextValue | null>(null);

function useTimeFieldContext(component: string): TimeFieldContextValue {
  const context = useContext(TimeFieldContext);
  if (!context) {
    throw new Error(`${component} must be used within TimeField`);
  }
  return context;
}

function getLabelText(children: ReactNode): string | undefined {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }
  return undefined;
}

function renderTimeFieldChildren(
  children: ReactNode,
  labelProps: React.HTMLAttributes<HTMLElement>,
  hasLabelProp: boolean,
) {
  return Children.map(children, (child) => {
    if (!isValidElement(child)) {
      return child;
    }

    const type = child.type as { displayName?: string };
    if (!hasLabelProp && type.displayName === "Label") {
      return cloneElement(
        child,
        mergeProps(labelProps, child.props as HTMLAttributes<HTMLElement>),
      );
    }

    return child;
  });
}

function hasCustomDateInput(children: ReactNode) {
  return Children.toArray(children).some(
    (child) =>
      isValidElement(child) &&
      (child.type as { displayName?: string }).displayName === "DateInput",
  );
}

function TimeField<T extends TimeValue>({
  children,
  className,
  isDisabled,
  isInvalid,
  ref,
  ...props
}: TimeFieldProps<T>) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const field = useFieldContext();
  const { locale } = useLocale();
  const labelChild = Children.toArray(children).find(
    (child) =>
      isValidElement(child) &&
      (child.type as { displayName?: string }).displayName === "Label",
  );
  const labelFromChild = isValidElement(labelChild)
    ? getLabelText((labelChild.props as { children?: ReactNode }).children)
    : undefined;
  const resolvedLabel = props.label ?? labelFromChild;

  const state = useTimeFieldState({
    ...props,
    locale,
    ...(isDisabled !== undefined ? { isDisabled } : {}),
    ...(isInvalid !== undefined ? { isInvalid } : {}),
  });

  const ariaProps = {
    ...props,
    ...(resolvedLabel ? { label: resolvedLabel } : {}),
    ...(field?.inputId ? { id: field.inputId } : {}),
    ...(isDisabled !== undefined ? { isDisabled } : {}),
    ...(isInvalid !== undefined ? { isInvalid } : {}),
  } as Parameters<typeof useTimeField<T>>[0];

  const { labelProps, fieldProps, descriptionProps, errorMessageProps } =
    useTimeField(ariaProps, state, fieldRef);

  const fieldAria = useFieldInputAria(
    fieldProps as { "aria-describedby"?: string; "aria-errormessage"?: string },
  );

  const contextValue = useMemo(
    () => ({
      state,
      fieldRef,
      fieldProps,
      labelProps,
      descriptionProps,
      errorMessageProps,
      isDisabled: Boolean(isDisabled),
      isInvalid: Boolean(isInvalid),
    }),
    [
      state,
      fieldProps,
      labelProps,
      descriptionProps,
      errorMessageProps,
      isDisabled,
      isInvalid,
    ],
  );

  const showDefaultInput = !children || !hasCustomDateInput(children);

  return (
    <TimeFieldContext.Provider value={contextValue}>
      <Field
        data-time-field=""
        data-slot="time-field"
        className={cn(styles.root, className)}
      >
        {props.label ? <span {...labelProps}>{props.label}</span> : null}
        {props.description ? (
          <span {...descriptionProps}>{props.description}</span>
        ) : null}
        {children
          ? renderTimeFieldChildren(children, labelProps, Boolean(props.label))
          : null}
        {typeof props.errorMessage ===
        "function" ? null : props.errorMessage ? (
          <div {...errorMessageProps}>{props.errorMessage}</div>
        ) : null}
        {showDefaultInput ? (
          <DateInputContext.Provider value={{ kind: "time", state }}>
            <div
              {...mergeProps(fieldProps, fieldAria)}
              ref={composeRefs(fieldRef, ref)}
              data-time-field-input=""
              className={styles.field}
            >
              <DateInput />
            </div>
          </DateInputContext.Provider>
        ) : null}
      </Field>
    </TimeFieldContext.Provider>
  );
}

export type { TimeFieldProps } from "./types";
export { TimeField, useTimeFieldContext };
