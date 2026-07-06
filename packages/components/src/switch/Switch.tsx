import { cn } from "@dev-ui/core";
import { useFocusRing } from "@react-aria/focus";
import { useHover } from "@react-aria/interactions";
import { useSwitch } from "@react-aria/switch";
import { mergeProps } from "@react-aria/utils";
import { useToggleState } from "@react-stately/toggle";
import { motion, useReducedMotion } from "motion/react";
import {
  createContext,
  type ReactNode,
  useContext,
  useId,
  useRef,
} from "react";
import { Label } from "../field/Field";
import { getSwapTransition } from "../motion/presets";
import styles from "./switch.module.scss";
import type {
  SwitchControlProps,
  SwitchIndicatorProps,
  SwitchProps,
  SwitchSize,
  SwitchThumbProps,
} from "./switch.types";

const THUMB_OFFSET: Record<SwitchSize, number> = {
  sm: 16,
  md: 20,
  lg: 24,
};

type SwitchRenderState = {
  isSelected: boolean;
  isDisabled: boolean;
  isHovered: boolean;
  isFocusVisible: boolean;
  size: SwitchSize;
};

const SwitchStyleContext = createContext<{ size: SwitchSize }>({ size: "md" });
const SwitchContext = createContext<SwitchRenderState | null>(null);

function Switch({
  id: idProp,
  ref,
  size = "md",
  children,
  className,
  ...props
}: SwitchProps) {
  const autoId = useId();
  const labelId = useId();
  const inputId = idProp ?? autoId;

  return (
    <SwitchStyleContext.Provider value={{ size }}>
      <div ref={ref} data-switch="" className={cn(styles.root, className)}>
        {typeof children === "string" ? (
          <>
            <SwitchControl
              {...props}
              id={inputId}
              size={size}
              aria-labelledby={labelId}
            />
            <Label id={labelId} htmlFor={inputId}>
              {children}
            </Label>
          </>
        ) : (
          ((children as ReactNode) ?? (
            <SwitchControl {...props} id={inputId} size={size} />
          ))
        )}
      </div>
    </SwitchStyleContext.Provider>
  );
}

function SwitchControl({
  ref,
  size: sizeProp,
  className,
  children,
  ...props
}: SwitchControlProps) {
  const styleContext = useContext(SwitchStyleContext);
  const size = sizeProp ?? styleContext.size;
  const inputRef = useRef<HTMLInputElement>(null);
  const state = useToggleState(props);
  const disabled = Boolean(props.isDisabled);
  const { inputProps, isSelected } = useSwitch(
    props as Parameters<typeof useSwitch>[0],
    state,
    inputRef,
  );
  const { hoverProps, isHovered } = useHover({ isDisabled: disabled });
  const { focusProps, isFocusVisible } = useFocusRing();

  const renderState: SwitchRenderState = {
    isSelected,
    isDisabled: disabled,
    isHovered,
    isFocusVisible,
    size,
  };

  return (
    <SwitchContext.Provider value={renderState}>
      <label
        {...hoverProps}
        ref={ref as React.Ref<HTMLLabelElement>}
        data-switch-control=""
        data-disabled={disabled ? "true" : undefined}
        className={cn(styles.control, className)}
      >
        <input
          {...mergeProps(inputProps, focusProps)}
          ref={inputRef}
          className={styles.visuallyHidden}
        />
        {children ?? <SwitchIndicator size={size} />}
      </label>
    </SwitchContext.Provider>
  );
}

function SwitchIndicator({
  size: sizeProp,
  className,
  children,
  ...props
}: SwitchIndicatorProps & { size?: SwitchSize }) {
  const ctx = useContext(SwitchContext);
  const styleContext = useContext(SwitchStyleContext);

  if (!ctx) {
    return (
      <SwitchControl size={sizeProp}>
        <SwitchIndicator className={className} {...props} />
      </SwitchControl>
    );
  }

  const size = sizeProp ?? ctx.size ?? styleContext.size;

  return (
    <span
      data-size={size}
      data-selected={ctx.isSelected ? "true" : undefined}
      data-disabled={ctx.isDisabled ? "true" : undefined}
      data-hovered={ctx.isHovered ? "true" : undefined}
      data-focus-visible={ctx.isFocusVisible ? "true" : undefined}
      className={cn(styles.indicator, className)}
      {...props}
    >
      {children ?? <SwitchThumb />}
    </span>
  );
}

function SwitchThumb({ className }: SwitchThumbProps) {
  const ctx = useContext(SwitchContext);
  const styleContext = useContext(SwitchStyleContext);
  const reducedMotion = useReducedMotion();
  const size = ctx?.size ?? styleContext.size;
  const offset = THUMB_OFFSET[size];

  return (
    <motion.span
      className={cn(styles.thumb, className)}
      data-selected={ctx?.isSelected ? "true" : undefined}
      data-disabled={ctx?.isDisabled ? "true" : undefined}
      animate={{ x: ctx?.isSelected ? offset : 0 }}
      transition={getSwapTransition(reducedMotion)}
    />
  );
}

export type {
  SwitchControlProps,
  SwitchIndicatorProps,
  SwitchProps,
  SwitchSize,
  SwitchThumbProps,
} from "./switch.types";
export { Switch, SwitchControl, SwitchIndicator, SwitchThumb };
