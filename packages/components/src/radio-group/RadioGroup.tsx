import { cn, composeRefs } from "@dev-ui/core";
import { useFocusRing } from "@react-aria/focus";
import { useHover } from "@react-aria/interactions";
import { useRadio, useRadioGroup } from "@react-aria/radio";
import { mergeProps } from "@react-aria/utils";
import type { RadioGroupState } from "@react-stately/radio";
import { useRadioGroupState } from "@react-stately/radio";
import {
  createContext,
  type ReactNode,
  useContext,
  useId,
  useRef,
} from "react";
import { Label } from "../field/Field";
import styles from "./radio-group.module.scss";
import type {
  RadioControlProps,
  RadioGroupProps,
  RadioIndicatorProps,
  RadioProps,
} from "./radio-group.types";

type RadioRenderState = {
  isSelected: boolean;
  isDisabled: boolean;
  isHovered: boolean;
  isFocusVisible: boolean;
  isInvalid: boolean;
};

const RadioGroupContext = createContext<RadioGroupState | null>(null);
const RadioContext = createContext<RadioRenderState | null>(null);

function RadioGroup({ ref, children, className, ...props }: RadioGroupProps) {
  const groupRef = useRef<HTMLDivElement>(null);
  const state = useRadioGroupState(props);
  const { radioGroupProps, labelProps, descriptionProps, errorMessageProps } =
    useRadioGroup(props, state);

  return (
    <RadioGroupContext.Provider value={state}>
      <div
        {...radioGroupProps}
        ref={composeRefs(groupRef, ref)}
        data-radio-group=""
        className={cn(styles.group, className)}
      >
        {props.label ? (
          <span {...labelProps} className={styles.groupLabel}>
            {props.label}
          </span>
        ) : null}
        {props.description ? (
          <span {...descriptionProps} className={styles.groupDescription}>
            {props.description}
          </span>
        ) : null}
        {children}
        {typeof props.errorMessage ===
        "function" ? null : props.errorMessage ? (
          <div {...errorMessageProps} className={styles.groupError}>
            {props.errorMessage}
          </div>
        ) : null}
      </div>
    </RadioGroupContext.Provider>
  );
}

function Radio({
  id: idProp,
  ref,
  children,
  className,
  value,
  ...props
}: RadioProps) {
  const autoId = useId();
  const labelId = useId();
  const inputId = idProp ?? autoId;

  return (
    <div ref={ref} data-radio="" className={cn(styles.root, className)}>
      {typeof children === "string" ? (
        <>
          <RadioControl
            value={value}
            {...props}
            id={inputId}
            aria-labelledby={labelId}
          />
          <Label id={labelId} htmlFor={inputId}>
            {children}
          </Label>
        </>
      ) : (
        ((children as ReactNode) ?? (
          <RadioControl value={value} {...props} id={inputId} />
        ))
      )}
    </div>
  );
}

function RadioControl({
  ref,
  className,
  children,
  value,
  ...props
}: RadioControlProps) {
  const groupState = useContext(RadioGroupContext);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!groupState) {
    throw new Error("RadioControl must be used within RadioGroup");
  }

  const disabled = Boolean(props.isDisabled ?? groupState.isDisabled);
  const { inputProps, isSelected } = useRadio(
    { ...props, value, isDisabled: disabled },
    groupState,
    inputRef,
  );
  const { hoverProps, isHovered } = useHover({ isDisabled: disabled });
  const { focusProps, isFocusVisible } = useFocusRing();

  const renderState: RadioRenderState = {
    isSelected,
    isDisabled: disabled,
    isHovered,
    isFocusVisible,
    isInvalid: Boolean(groupState.isInvalid),
  };

  return (
    <RadioContext.Provider value={renderState}>
      <label
        {...hoverProps}
        ref={ref as React.Ref<HTMLLabelElement>}
        data-radio-control=""
        data-disabled={disabled ? "true" : undefined}
        className={cn(styles.control, className)}
      >
        <input
          {...mergeProps(inputProps, focusProps)}
          ref={inputRef}
          className={styles.visuallyHidden}
        />
        {children ?? <RadioIndicator />}
      </label>
    </RadioContext.Provider>
  );
}

function RadioIndicator({ className, ...props }: RadioIndicatorProps) {
  const ctx = useContext(RadioContext);

  if (!ctx) {
    throw new Error("RadioIndicator must be used within RadioControl");
  }

  return (
    <span
      className={cn(styles.indicator, className)}
      data-selected={ctx.isSelected ? "true" : undefined}
      data-disabled={ctx.isDisabled ? "true" : undefined}
      data-hovered={ctx.isHovered ? "true" : undefined}
      data-focus-visible={ctx.isFocusVisible ? "true" : undefined}
      data-invalid={ctx.isInvalid ? "true" : undefined}
      {...props}
    />
  );
}

export type {
  RadioControlProps,
  RadioGroupProps,
  RadioIndicatorProps,
  RadioProps,
} from "./radio-group.types";
export { Radio, RadioControl, RadioGroup, RadioIndicator };
