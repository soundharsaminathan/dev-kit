import { cn } from "@dev-ui/core";
import { Icon } from "@dev-ui/icons";
import { useCheckbox, useCheckboxGroupItem } from "@react-aria/checkbox";
import { useFocusRing } from "@react-aria/focus";
import { useHover } from "@react-aria/interactions";
import { mergeProps } from "@react-aria/utils";
import { useToggleState } from "@react-stately/toggle";
import {
  createContext,
  type ReactNode,
  useContext,
  useId,
  useRef,
} from "react";
import { CheckboxGroupContext } from "../checkbox-group/checkbox-group-context";
import { Label } from "../field/Field";
import styles from "./checkbox.module.scss";
import type {
  CheckboxControlProps,
  CheckboxIndicatorProps,
  CheckboxProps,
} from "./checkbox.types";

type CheckboxRenderState = {
  isSelected: boolean;
  isIndeterminate: boolean;
  isDisabled: boolean;
  isHovered: boolean;
  isFocusVisible: boolean;
  isInvalid: boolean;
};

const CheckboxContext = createContext<CheckboxRenderState | null>(null);

function Checkbox({
  id: idProp,
  ref,
  children,
  className,
  ...props
}: CheckboxProps) {
  const autoId = useId();
  const labelId = useId();
  const inputId = idProp ?? autoId;

  return (
    <div ref={ref} data-checkbox="" className={cn(styles.root, className)}>
      {typeof children === "string" ? (
        <>
          <CheckboxControl {...props} id={inputId} aria-labelledby={labelId} />
          <Label id={labelId} htmlFor={inputId}>
            {children}
          </Label>
        </>
      ) : (
        ((children as ReactNode) ?? <CheckboxControl {...props} id={inputId} />)
      )}
    </div>
  );
}

function CheckboxControl({
  ref,
  className,
  children,
  value,
  ...props
}: CheckboxControlProps) {
  const groupState = useContext(CheckboxGroupContext);

  if (groupState) {
    return (
      <CheckboxGroupItemControl
        {...props}
        ref={ref}
        className={className}
        value={value ?? ""}
      >
        {children}
      </CheckboxGroupItemControl>
    );
  }

  return (
    <CheckboxStandaloneControl {...props} ref={ref} className={className}>
      {children}
    </CheckboxStandaloneControl>
  );
}

function CheckboxStandaloneControl(props: CheckboxControlProps) {
  const { ref, className, children, ...rest } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const state = useToggleState(rest);
  const disabled = Boolean(rest.isDisabled);
  const { inputProps, labelProps, isSelected } = useCheckbox(
    rest as Parameters<typeof useCheckbox>[0],
    state,
    inputRef,
  );
  const isIndeterminate = Boolean(rest.isIndeterminate);
  const { hoverProps, isHovered } = useHover({ isDisabled: disabled });
  const { focusProps, isFocusVisible } = useFocusRing();

  const renderState: CheckboxRenderState = {
    isSelected,
    isIndeterminate,
    isDisabled: disabled,
    isHovered,
    isFocusVisible,
    isInvalid: Boolean(rest.isInvalid),
  };

  return (
    <CheckboxControlSurface
      ref={ref}
      className={className}
      labelProps={mergeProps(labelProps, hoverProps)}
      inputProps={mergeProps(inputProps, focusProps)}
      inputRef={inputRef}
      renderState={renderState}
    >
      {children}
    </CheckboxControlSurface>
  );
}

function CheckboxGroupItemControl(props: CheckboxControlProps) {
  const { ref, className, children, value = "", ...rest } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const groupState = useContext(CheckboxGroupContext);
  const disabled = Boolean(rest.isDisabled ?? groupState?.isDisabled);
  const { inputProps, labelProps, isSelected } = useCheckboxGroupItem(
    { ...rest, value, isDisabled: disabled },
    groupState!,
    inputRef,
  );
  const { hoverProps, isHovered } = useHover({ isDisabled: disabled });
  const { focusProps, isFocusVisible } = useFocusRing();

  const renderState: CheckboxRenderState = {
    isSelected,
    isIndeterminate: false,
    isDisabled: disabled,
    isHovered,
    isFocusVisible,
    isInvalid: Boolean(groupState?.isInvalid),
  };

  return (
    <CheckboxControlSurface
      ref={ref}
      className={className}
      labelProps={mergeProps(labelProps, hoverProps)}
      inputProps={mergeProps(inputProps, focusProps)}
      inputRef={inputRef}
      renderState={renderState}
    >
      {children}
    </CheckboxControlSurface>
  );
}

function CheckboxControlSurface({
  ref,
  className,
  children,
  labelProps,
  inputProps,
  inputRef,
  renderState,
}: {
  ref?: CheckboxControlProps["ref"] | undefined;
  className?: string | undefined;
  children?: ReactNode;
  labelProps: React.LabelHTMLAttributes<HTMLLabelElement>;
  inputProps: React.InputHTMLAttributes<HTMLInputElement>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  renderState: CheckboxRenderState;
}) {
  return (
    <CheckboxContext.Provider value={renderState}>
      <label
        {...labelProps}
        ref={ref as React.Ref<HTMLLabelElement>}
        data-checkbox-control=""
        data-disabled={renderState.isDisabled ? "true" : undefined}
        className={cn(styles.control, className)}
      >
        <input
          {...inputProps}
          ref={inputRef}
          className={styles.visuallyHidden}
        />
        {children ?? <CheckboxIndicator />}
      </label>
    </CheckboxContext.Provider>
  );
}

function CheckboxIndicator({
  className,
  children,
  ...props
}: CheckboxIndicatorProps) {
  const ctx = useContext(CheckboxContext);
  if (!ctx) {
    return (
      <CheckboxControl>
        <CheckboxIndicator className={className} {...props} />
      </CheckboxControl>
    );
  }

  return (
    <span
      className={cn(styles.indicator, className)}
      data-selected={ctx.isSelected ? "true" : undefined}
      data-indeterminate={ctx.isIndeterminate ? "true" : undefined}
      data-disabled={ctx.isDisabled ? "true" : undefined}
      data-hovered={ctx.isHovered ? "true" : undefined}
      data-focus-visible={ctx.isFocusVisible ? "true" : undefined}
      data-invalid={ctx.isInvalid ? "true" : undefined}
      {...props}
    >
      {children ??
        (ctx.isIndeterminate ? (
          <Icon name="minus" />
        ) : ctx.isSelected ? (
          <Icon name="check" />
        ) : null)}
    </span>
  );
}

export type {
  CheckboxControlProps,
  CheckboxIndicatorProps,
  CheckboxProps,
} from "./checkbox.types";
export { Checkbox, CheckboxControl, CheckboxIndicator };
