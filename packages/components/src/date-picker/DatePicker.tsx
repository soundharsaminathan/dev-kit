import { cn } from "@dev-ui/core";
import { Icon } from "@dev-ui/icons";
import { createCalendar } from "@internationalized/date";
import {
  type AriaDatePickerProps,
  useDateField,
  useDatePicker,
  useDateRangePicker,
} from "@react-aria/datepicker";
import { useDialog } from "@react-aria/dialog";
import { useLocale } from "@react-aria/i18n";
import { OverlayContainer } from "@react-aria/overlays";
import { mergeProps } from "@react-aria/utils";
import {
  type DateValue,
  useDateFieldState,
  useDatePickerState,
  useDateRangePickerState,
} from "@react-stately/datepicker";
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
import { Button } from "../button/Button";
import { Calendar, RangeCalendar } from "../calendar/Calendar";
import { Field } from "../field/Field";
import { useFieldContext } from "../field/field-context";
import { DateInput } from "../input/DateInput";
import { DateInputContext } from "../input/date-input-context";
import { Popover, PopoverProvider } from "../popover/Popover";
import styles from "./date-picker.module.scss";
import type {
  DatePickerButtonProps,
  DatePickerContextValue,
  DatePickerPopoverProps,
  DatePickerProps,
  DatePickerTriggerProps,
  DateRangePickerContextValue,
  DateRangePickerProps,
} from "./types";

const DatePickerContext = createContext<DatePickerContextValue | null>(null);
const DateRangePickerContext =
  createContext<DateRangePickerContextValue | null>(null);

function useDatePickerContext(component: string): DatePickerContextValue {
  const context = useContext(DatePickerContext);
  if (!context) {
    throw new Error(`${component} must be used within DatePicker`);
  }
  return context;
}

function useDateRangePickerContext(
  component: string,
): DateRangePickerContextValue {
  const context = useContext(DateRangePickerContext);
  if (!context) {
    throw new Error(`${component} must be used within DateRangePicker`);
  }
  return context;
}

function getLabelText(children: ReactNode): string | undefined {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }
  return undefined;
}

function renderPickerChildren(
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

function DatePickerInput({
  fieldProps,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  fieldProps: AriaDatePickerProps<DateValue>;
}) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const { locale } = useLocale();
  const state = useDateFieldState({
    ...fieldProps,
    locale,
    createCalendar,
  });
  const { fieldProps: ariaFieldProps } = useDateField(
    fieldProps,
    state,
    fieldRef,
  );

  return (
    <DateInputContext.Provider value={{ kind: "date", state }}>
      <div
        {...mergeProps(ariaFieldProps, props)}
        ref={fieldRef}
        data-date-picker-input=""
        className={className}
      >
        <DateInput />
      </div>
    </DateInputContext.Provider>
  );
}

function DatePicker<T extends DateValue>({
  children,
  className,
  isDisabled,
  isInvalid,
  ...props
}: DatePickerProps<T>) {
  const groupRef = useRef<HTMLDivElement>(null);
  const field = useFieldContext();
  const labelChild = Children.toArray(children).find(
    (child) =>
      isValidElement(child) &&
      (child.type as { displayName?: string }).displayName === "Label",
  );
  const labelFromChild = isValidElement(labelChild)
    ? getLabelText((labelChild.props as { children?: ReactNode }).children)
    : undefined;
  const resolvedLabel = props.label ?? labelFromChild;

  const state = useDatePickerState({
    ...props,
    ...(isDisabled !== undefined ? { isDisabled } : {}),
  });

  const ariaProps = {
    ...props,
    ...(resolvedLabel ? { label: resolvedLabel } : {}),
    ...(field?.inputId ? { id: field.inputId } : {}),
    ...(isDisabled !== undefined ? { isDisabled } : {}),
    ...(isInvalid !== undefined ? { isInvalid } : {}),
  } as Parameters<typeof useDatePicker<T>>[0];

  const {
    groupProps,
    labelProps,
    fieldProps,
    buttonProps,
    dialogProps,
    descriptionProps,
    errorMessageProps,
    calendarProps,
  } = useDatePicker(ariaProps, state, groupRef);

  const contextValue = useMemo(
    () => ({
      state,
      groupRef,
      groupProps,
      fieldProps,
      buttonProps,
      labelProps,
      descriptionProps,
      errorMessageProps,
      dialogProps,
      calendarProps,
      isDisabled: Boolean(isDisabled),
      isInvalid: Boolean(isInvalid),
    }),
    [
      state,
      groupProps,
      fieldProps,
      buttonProps,
      labelProps,
      descriptionProps,
      errorMessageProps,
      dialogProps,
      calendarProps,
      isDisabled,
      isInvalid,
    ],
  );

  return (
    <DatePickerContext.Provider value={contextValue}>
      <PopoverProvider value={{ triggerRef: groupRef, state }}>
        <Field
          data-date-picker=""
          data-slot="date-picker"
          className={cn(styles.root, className)}
        >
          {props.label ? <span {...labelProps}>{props.label}</span> : null}
          {props.description ? (
            <span {...descriptionProps}>{props.description}</span>
          ) : null}
          {children
            ? renderPickerChildren(children, labelProps, Boolean(props.label))
            : null}
          {typeof props.errorMessage ===
          "function" ? null : props.errorMessage ? (
            <div {...errorMessageProps}>{props.errorMessage}</div>
          ) : null}
          {!children ? (
            <>
              <DatePickerTrigger />
              <DatePickerPopover />
            </>
          ) : null}
        </Field>
      </PopoverProvider>
    </DatePickerContext.Provider>
  );
}

function DatePickerTrigger({
  className,
  children,
  ...props
}: DatePickerTriggerProps) {
  const {
    groupRef,
    groupProps,
    fieldProps,
    buttonProps,
    isDisabled,
    isInvalid,
  } = useDatePickerContext("DatePickerTrigger");

  return (
    <div
      {...mergeProps(groupProps, props)}
      ref={groupRef}
      data-date-picker-trigger=""
      data-disabled={isDisabled ? "true" : undefined}
      data-invalid={isInvalid ? "true" : undefined}
      className={cn(styles.trigger, className)}
    >
      {children ?? (
        <>
          <DatePickerInput fieldProps={fieldProps} />
          <DatePickerButton {...buttonProps} />
        </>
      )}
    </div>
  );
}
DatePickerTrigger.displayName = "DatePickerTrigger";

function DatePickerButton({
  className,
  children,
  ...props
}: DatePickerButtonProps) {
  return (
    <Button
      {...props}
      variant="quiet"
      isIconOnly
      data-date-picker-button=""
      className={cn(styles.calendarButton, className)}
    >
      {children ?? <Icon name="calendar" className={styles.calendarIcon} />}
    </Button>
  );
}
DatePickerButton.displayName = "DatePickerButton";

function DatePickerDialog({
  className,
  children,
}: {
  className?: string | undefined;
  children?: ReactNode;
}) {
  const { dialogProps } = useDatePickerContext("DatePickerDialog");
  const dialogRef = useRef<HTMLDivElement>(null);
  const { dialogProps: ariaDialogProps } = useDialog(
    { role: "dialog" },
    dialogRef,
  );

  return (
    <div
      {...mergeProps(dialogProps, ariaDialogProps)}
      ref={dialogRef}
      data-date-picker-dialog=""
      className={cn(styles.dialog, className)}
    >
      {children}
    </div>
  );
}
DatePickerDialog.displayName = "DatePickerDialog";

function DatePickerPopover({
  className,
  placement = "bottom",
  children,
}: DatePickerPopoverProps) {
  const { state, calendarProps } = useDatePickerContext("DatePickerPopover");

  if (!state.isOpen) {
    return null;
  }

  return (
    <OverlayContainer>
      <Popover placement={placement} className={cn(styles.popover, className)}>
        <DatePickerDialog>
          {children ?? <Calendar {...calendarProps} />}
        </DatePickerDialog>
      </Popover>
    </OverlayContainer>
  );
}
DatePickerPopover.displayName = "DatePickerPopover";

function DateRangePicker<T extends DateValue>({
  children,
  className,
  isDisabled,
  isInvalid,
  ...props
}: DateRangePickerProps<T>) {
  const groupRef = useRef<HTMLDivElement>(null);
  const field = useFieldContext();
  const labelChild = Children.toArray(children).find(
    (child) =>
      isValidElement(child) &&
      (child.type as { displayName?: string }).displayName === "Label",
  );
  const labelFromChild = isValidElement(labelChild)
    ? getLabelText((labelChild.props as { children?: ReactNode }).children)
    : undefined;
  const resolvedLabel = props.label ?? labelFromChild;

  const state = useDateRangePickerState({
    ...props,
    ...(isDisabled !== undefined ? { isDisabled } : {}),
  });

  const ariaProps = {
    ...props,
    ...(resolvedLabel ? { label: resolvedLabel } : {}),
    ...(field?.inputId ? { id: field.inputId } : {}),
    ...(isDisabled !== undefined ? { isDisabled } : {}),
    ...(isInvalid !== undefined ? { isInvalid } : {}),
  } as Parameters<typeof useDateRangePicker<T>>[0];

  const {
    groupProps,
    labelProps,
    startFieldProps,
    endFieldProps,
    buttonProps,
    dialogProps,
    descriptionProps,
    errorMessageProps,
    calendarProps,
  } = useDateRangePicker(ariaProps, state, groupRef);

  const contextValue = useMemo(
    () => ({
      state,
      groupRef,
      groupProps,
      startFieldProps,
      endFieldProps,
      buttonProps,
      labelProps,
      descriptionProps,
      errorMessageProps,
      dialogProps,
      calendarProps,
      isDisabled: Boolean(isDisabled),
      isInvalid: Boolean(isInvalid),
    }),
    [
      state,
      groupProps,
      startFieldProps,
      endFieldProps,
      buttonProps,
      labelProps,
      descriptionProps,
      errorMessageProps,
      dialogProps,
      calendarProps,
      isDisabled,
      isInvalid,
    ],
  );

  return (
    <DateRangePickerContext.Provider value={contextValue}>
      <PopoverProvider value={{ triggerRef: groupRef, state }}>
        <Field
          data-date-picker=""
          data-slot="date-range-picker"
          className={cn(styles.root, className)}
        >
          {props.label ? <span {...labelProps}>{props.label}</span> : null}
          {props.description ? (
            <span {...descriptionProps}>{props.description}</span>
          ) : null}
          {children
            ? renderPickerChildren(children, labelProps, Boolean(props.label))
            : null}
          {typeof props.errorMessage ===
          "function" ? null : props.errorMessage ? (
            <div {...errorMessageProps}>{props.errorMessage}</div>
          ) : null}
          {!children ? (
            <>
              <DateRangePickerTrigger />
              <DateRangePickerPopover />
            </>
          ) : null}
        </Field>
      </PopoverProvider>
    </DateRangePickerContext.Provider>
  );
}

function DateRangePickerTrigger({
  className,
  children,
  ...props
}: DatePickerTriggerProps) {
  const {
    groupRef,
    groupProps,
    startFieldProps,
    endFieldProps,
    buttonProps,
    isDisabled,
    isInvalid,
  } = useDateRangePickerContext("DateRangePickerTrigger");

  return (
    <div
      {...mergeProps(groupProps, props)}
      ref={groupRef}
      data-date-picker-trigger=""
      data-disabled={isDisabled ? "true" : undefined}
      data-invalid={isInvalid ? "true" : undefined}
      className={cn(styles.trigger, className)}
    >
      {children ?? (
        <>
          <DatePickerInput
            fieldProps={startFieldProps}
            data-date-picker-start-input=""
          />
          <span className={styles.rangeSeparator} aria-hidden="true">
            –
          </span>
          <DatePickerInput
            fieldProps={endFieldProps}
            data-date-picker-end-input=""
          />
          <DatePickerButton {...buttonProps} />
        </>
      )}
    </div>
  );
}
DateRangePickerTrigger.displayName = "DateRangePickerTrigger";

function DateRangePickerDialog({
  className,
  children,
}: {
  className?: string | undefined;
  children?: ReactNode;
}) {
  const { dialogProps } = useDateRangePickerContext("DateRangePickerDialog");
  const dialogRef = useRef<HTMLDivElement>(null);
  const { dialogProps: ariaDialogProps } = useDialog(
    { role: "dialog" },
    dialogRef,
  );

  return (
    <div
      {...mergeProps(dialogProps, ariaDialogProps)}
      ref={dialogRef}
      data-date-picker-dialog=""
      className={cn(styles.dialog, className)}
    >
      {children}
    </div>
  );
}
DateRangePickerDialog.displayName = "DateRangePickerDialog";

function DateRangePickerPopover({
  className,
  placement = "bottom",
  children,
}: DatePickerPopoverProps) {
  const { state, calendarProps } = useDateRangePickerContext(
    "DateRangePickerPopover",
  );

  if (!state.isOpen) {
    return null;
  }

  return (
    <OverlayContainer>
      <Popover placement={placement} className={cn(styles.popover, className)}>
        <DateRangePickerDialog>
          {children ?? (
            <RangeCalendar
              {...(calendarProps as Parameters<typeof RangeCalendar>[0])}
            />
          )}
        </DateRangePickerDialog>
      </Popover>
    </OverlayContainer>
  );
}
DateRangePickerPopover.displayName = "DateRangePickerPopover";

export type {
  DatePickerButtonProps,
  DatePickerPopoverProps,
  DatePickerProps,
  DatePickerTriggerProps,
  DateRangePickerProps,
} from "./types";
export {
  DatePicker,
  DatePickerButton,
  DatePickerDialog,
  DatePickerPopover,
  DatePickerTrigger,
  DateRangePicker,
  DateRangePickerDialog,
  DateRangePickerPopover,
  DateRangePickerTrigger,
};
