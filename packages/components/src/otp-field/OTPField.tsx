import { cn } from "@dev-ui/core";
import { filterDOMProps } from "@react-aria/utils";
import {
  type HTMLAttributes,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { Field } from "../field/Field";
import { Group } from "../group/Group";
import { Input } from "../input/Input";
import styles from "./otp-field.module.scss";
import type {
  OTPFieldContextValue,
  OTPFieldProps,
  OTPFieldSeparatorProps,
} from "./otp-field.types";
import { OTPFieldContext } from "./otp-field-context";

function OTPFieldRoot({
  children,
  className,
  id: idProp,
  length,
  value: valueProp,
  defaultValue = "",
  onChange,
  name,
  isDisabled = false,
  isInvalid = false,
  isReadOnly = false,
  isRequired = false,
  ref,
  ...props
}: OTPFieldProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cellIndexRef = useRef(0);
  cellIndexRef.current = 0;

  const isControlled = valueProp !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const value = isControlled ? valueProp : uncontrolledValue;

  const setValue = useCallback(
    (nextValue: string) => {
      const trimmed = nextValue.slice(0, length);
      if (!isControlled) {
        setUncontrolledValue(trimmed);
      }
      onChange?.(trimmed);
    },
    [isControlled, length, onChange],
  );

  const getNextCellIndex = useCallback(() => {
    const index = cellIndexRef.current;
    cellIndexRef.current += 1;
    return index;
  }, []);

  const setCellRef = useCallback(
    (index: number, element: HTMLInputElement | null) => {
      inputRefs.current[index] = element;
    },
    [],
  );

  const focusCell = useCallback((index: number) => {
    const input = inputRefs.current[index];
    input?.focus();
    input?.select();
  }, []);

  const contextValue = useMemo<OTPFieldContextValue>(
    () => ({
      length,
      value,
      setValue,
      getNextCellIndex,
      setCellRef,
      focusCell,
      isDisabled,
      isReadOnly,
      isInvalid,
      isRequired,
    }),
    [
      length,
      value,
      setValue,
      getNextCellIndex,
      setCellRef,
      focusCell,
      isDisabled,
      isReadOnly,
      isInvalid,
      isRequired,
    ],
  );

  const digitKeys = useMemo(
    () => Array.from({ length }, (_, index) => `otp-digit-${index + 1}`),
    [length],
  );

  const domProps = filterDOMProps(
    props as Parameters<typeof filterDOMProps>[0],
  ) as HTMLAttributes<HTMLDivElement>;

  return (
    <OTPFieldContext.Provider value={contextValue}>
      <div
        {...domProps}
        ref={ref}
        id={idProp}
        data-otp-field=""
        data-field=""
        data-invalid={isInvalid ? "true" : undefined}
        className={cn(styles.root, className)}
      >
        {name ? (
          <input
            type="hidden"
            name={name}
            value={value}
            tabIndex={-1}
            aria-hidden="true"
            className={styles.hiddenInput}
            readOnly
          />
        ) : null}
        {children ?? (
          <Group isDisabled={isDisabled} isInvalid={isInvalid}>
            {digitKeys.map((key, index) => (
              <Input
                key={key}
                aria-label={index === 0 ? undefined : `Digit ${index + 1}`}
              />
            ))}
          </Group>
        )}
      </div>
    </OTPFieldContext.Provider>
  );
}

function OTPField({ className, children, ...props }: OTPFieldProps) {
  return (
    <Field data-slot="otp-field" className={className}>
      <OTPFieldRoot {...props}>{children}</OTPFieldRoot>
    </Field>
  );
}

function OTPFieldSeparator({
  className,
  children,
  ref,
  ...props
}: OTPFieldSeparatorProps) {
  return (
    <span
      {...props}
      ref={ref}
      data-otp-field-separator=""
      data-slot="otp-field-separator"
      aria-hidden="true"
      className={cn(styles.separator, className)}
    >
      {children}
    </span>
  );
}

export type { OTPFieldProps, OTPFieldSeparatorProps } from "./otp-field.types";
export { OTPField, OTPFieldSeparator };
