import { cn, composeRefs } from "@dev-ui/core";
import { useButton } from "@react-aria/button";
import { useLocale } from "@react-aria/i18n";
import { useNumberField } from "@react-aria/numberfield";
import { mergeProps } from "@react-aria/utils";
import { useNumberFieldState } from "@react-stately/numberfield";
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
import styles from "./number-field.module.scss";
import type {
  NumberFieldButtonProps,
  NumberFieldContextValue,
  NumberFieldGroupProps,
  NumberFieldInputProps,
  NumberFieldProps,
} from "./number-field.types";

const NumberFieldContext = createContext<NumberFieldContextValue | null>(null);

function useNumberFieldContext(component: string): NumberFieldContextValue {
  const context = useContext(NumberFieldContext);
  if (!context) {
    throw new Error(`${component} must be used within NumberField`);
  }
  return context;
}

function MinusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function getLabelText(children: ReactNode): string | undefined {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }
  return undefined;
}

function renderNumberFieldChildren(
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

function NumberField({
  children,
  className,
  isDisabled,
  isInvalid,
  ...props
}: NumberFieldProps) {
  return (
    <Field data-slot="number-field" className={className}>
      <NumberFieldRoot
        {...props}
        {...(isDisabled !== undefined ? { isDisabled } : {})}
        {...(isInvalid !== undefined ? { isInvalid } : {})}
      >
        {children}
      </NumberFieldRoot>
    </Field>
  );
}

function NumberFieldRoot({
  children,
  isDisabled,
  isInvalid,
  ...props
}: Omit<NumberFieldProps, "className">) {
  const field = useFieldContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const { locale } = useLocale();
  const labelChild = Children.toArray(children).find(
    (child) =>
      isValidElement(child) &&
      (child.type as { displayName?: string }).displayName === "Label",
  );
  const labelFromChild = isValidElement(labelChild)
    ? getLabelText((labelChild.props as { children?: ReactNode }).children)
    : undefined;
  const resolvedLabel =
    props.label ??
    labelFromChild ??
    (typeof props["aria-label"] === "string" ? props["aria-label"] : undefined);
  const ariaProps: Parameters<typeof useNumberField>[0] = {
    ...props,
    ...(resolvedLabel ? { label: resolvedLabel } : {}),
    ...(field?.inputId ? { id: field.inputId } : {}),
    ...(isDisabled !== undefined ? { isDisabled } : {}),
    ...(isInvalid !== undefined ? { isInvalid } : {}),
  };
  const state = useNumberFieldState({ ...props, locale });
  const {
    groupProps,
    inputProps,
    incrementButtonProps,
    decrementButtonProps,
    labelProps,
  } = useNumberField(ariaProps, state, inputRef);

  const contextValue = useMemo(
    () => ({
      state,
      inputRef,
      groupProps,
      inputProps,
      incrementButtonProps,
      decrementButtonProps,
      isDisabled: Boolean(isDisabled),
      isInvalid: Boolean(isInvalid),
    }),
    [
      state,
      groupProps,
      inputProps,
      incrementButtonProps,
      decrementButtonProps,
      isDisabled,
      isInvalid,
    ],
  );

  return (
    <NumberFieldContext.Provider value={contextValue}>
      {children ? (
        renderNumberFieldChildren(children, labelProps, Boolean(props.label))
      ) : (
        <NumberFieldGroup>
          <NumberFieldDecrement />
          <NumberFieldInput />
          <NumberFieldIncrement />
        </NumberFieldGroup>
      )}
    </NumberFieldContext.Provider>
  );
}

function NumberFieldGroup({
  className,
  children,
  ...props
}: NumberFieldGroupProps) {
  const { groupProps, isDisabled, isInvalid } =
    useNumberFieldContext("NumberFieldGroup");

  return (
    <div
      {...mergeProps(groupProps, props)}
      data-number-field-group=""
      data-disabled={isDisabled ? "true" : undefined}
      data-invalid={isInvalid ? "true" : undefined}
      className={cn(styles.group, className)}
    >
      {children}
    </div>
  );
}

function NumberFieldInput({
  ref,
  size = "md",
  className,
}: NumberFieldInputProps) {
  const { inputRef, inputProps, isDisabled } =
    useNumberFieldContext("NumberFieldInput");
  const inputAria = inputProps as React.InputHTMLAttributes<HTMLInputElement>;
  const fieldAria = useFieldInputAria(inputAria);

  return (
    <input
      {...inputProps}
      {...fieldAria}
      ref={composeRefs(inputRef, ref)}
      data-number-field-input=""
      data-input-control=""
      data-size={size}
      data-disabled={isDisabled ? "true" : undefined}
      className={cn(styles.input, className)}
    />
  );
}

function NumberFieldDecrement({
  ref,
  className,
  children,
  ...props
}: NumberFieldButtonProps) {
  const { decrementButtonProps } = useNumberFieldContext(
    "NumberFieldDecrement",
  );
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { buttonProps } = useButton(
    decrementButtonProps as Parameters<typeof useButton>[0],
    buttonRef,
  );

  return (
    <button
      {...mergeProps(buttonProps, props)}
      ref={composeRefs(buttonRef, ref)}
      type="button"
      data-number-field-decrement=""
      data-size="md"
      className={cn(styles.button, className)}
    >
      {children ?? <MinusIcon />}
    </button>
  );
}

function NumberFieldIncrement({
  ref,
  className,
  children,
  ...props
}: NumberFieldButtonProps) {
  const { incrementButtonProps } = useNumberFieldContext(
    "NumberFieldIncrement",
  );
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { buttonProps } = useButton(
    incrementButtonProps as Parameters<typeof useButton>[0],
    buttonRef,
  );

  return (
    <button
      {...mergeProps(buttonProps, props)}
      ref={composeRefs(buttonRef, ref)}
      type="button"
      data-number-field-increment=""
      data-size="md"
      className={cn(styles.button, className)}
    >
      {children ?? <PlusIcon />}
    </button>
  );
}

export type {
  NumberFieldButtonProps,
  NumberFieldGroupProps,
  NumberFieldInputProps,
  NumberFieldProps,
} from "./number-field.types";
export {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
};
