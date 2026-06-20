import { cn, composeRefs } from "@dev-ui/core";
import { createCalendar } from "@internationalized/date";
import { useDateField } from "@react-aria/datepicker";
import { useLocale } from "@react-aria/i18n";
import { mergeProps } from "@react-aria/utils";
import { useDateFieldState } from "@react-stately/datepicker";
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
import styles from "./date-field.module.scss";
import type { DateFieldContextValue, DateFieldProps } from "./types";

const DateFieldContext = createContext<DateFieldContextValue | null>(null);

function useDateFieldContext(component: string): DateFieldContextValue {
  const context = useContext(DateFieldContext);
  if (!context) {
    throw new Error(`${component} must be used within DateField`);
  }
  return context;
}

function getLabelText(children: ReactNode): string | undefined {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }
  return undefined;
}

function renderDateFieldChildren(
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
      (child.type as { displayName?: string; name?: string }).displayName ===
        "DateInput",
  );
}

function DateField<T extends import("@react-stately/datepicker").DateValue>({
  children,
  className,
  isDisabled,
  isInvalid,
  ref,
  ...props
}: DateFieldProps<T>) {
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

  const state = useDateFieldState({
    ...props,
    locale,
    createCalendar,
    ...(isDisabled !== undefined ? { isDisabled } : {}),
    ...(isInvalid !== undefined ? { isInvalid } : {}),
  });

  const ariaProps = {
    ...props,
    ...(resolvedLabel ? { label: resolvedLabel } : {}),
    ...(field?.inputId ? { id: field.inputId } : {}),
    ...(isDisabled !== undefined ? { isDisabled } : {}),
    ...(isInvalid !== undefined ? { isInvalid } : {}),
  } as Parameters<typeof useDateField<T>>[0];

  const { labelProps, fieldProps, descriptionProps, errorMessageProps } =
    useDateField(ariaProps, state, fieldRef);

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
    <DateFieldContext.Provider value={contextValue}>
      <Field
        data-date-field=""
        data-slot="date-field"
        className={cn(styles.root, className)}
      >
        {props.label ? <span {...labelProps}>{props.label}</span> : null}
        {props.description ? (
          <span {...descriptionProps}>{props.description}</span>
        ) : null}
        {children
          ? renderDateFieldChildren(children, labelProps, Boolean(props.label))
          : null}
        {typeof props.errorMessage ===
        "function" ? null : props.errorMessage ? (
          <div {...errorMessageProps}>{props.errorMessage}</div>
        ) : null}
        {showDefaultInput ? (
          <DateInputContext.Provider value={{ kind: "date", state }}>
            <div
              {...mergeProps(fieldProps, fieldAria)}
              ref={composeRefs(fieldRef, ref)}
              data-date-field-input=""
              className={styles.field}
            >
              <DateInput />
            </div>
          </DateInputContext.Provider>
        ) : null}
      </Field>
    </DateFieldContext.Provider>
  );
}

export type { DateFieldProps } from "./types";
export { DateField, useDateFieldContext };
