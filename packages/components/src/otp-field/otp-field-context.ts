import { cn, composeRefs } from "@dev-ui/core";
import { useFocusRing } from "@react-aria/focus";
import { mergeProps } from "@react-aria/utils";
import {
  type ClipboardEvent,
  createContext,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type Ref,
  useCallback,
  useContext,
  useRef,
} from "react";
import { useFieldContext, useFieldInputAria } from "../field/field-context";
import inputStyles from "../input/input.module.scss";
import type { InputProps } from "../input/input.types";
import type { OTPFieldContextValue } from "./otp-field.types";

export type OTPCellInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "ref"
> & {
  ref?: Ref<HTMLInputElement> | undefined;
};

export const OTPFieldContext = createContext<OTPFieldContextValue | null>(null);

export function useOTPFieldContext(): OTPFieldContextValue | null {
  return useContext(OTPFieldContext);
}

function getDigits(value: string, length: number): string[] {
  return Array.from({ length }, (_, index) => value[index] ?? "");
}

function composeValue(digits: string[]): string {
  return digits.join("").replace(/\s+$/, "");
}

export function useOTPFieldCellProps({
  ref,
  size = "md",
  isDisabled,
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-errormessage": ariaErrorMessage,
  "aria-label": ariaLabel,
  className,
  disabled,
  readOnly,
  onChange,
  onKeyDown,
  onPaste,
  onFocus,
  ...props
}: InputProps): OTPCellInputProps | null {
  const otp = useOTPFieldContext();
  const field = useFieldContext();
  const domRef = useRef<HTMLInputElement>(null);
  const indexRef = useRef<number | null>(null);

  if (otp && indexRef.current === null) {
    indexRef.current = otp.getNextCellIndex();
  }

  const index = indexRef.current ?? -1;
  const { focusProps, isFocusVisible } = useFocusRing({
    isTextInput: true,
  });
  const fieldAria = useFieldInputAria({
    "aria-describedby": ariaDescribedBy,
    "aria-errormessage": ariaErrorMessage,
  });

  const setCellRef = useCallback(
    (element: HTMLInputElement | null) => {
      if (index >= 0) {
        otp?.setCellRef(index, element);
      }
    },
    [otp, index],
  );

  if (!otp || index < 0) {
    return null;
  }

  const resolvedDisabled = Boolean(disabled ?? isDisabled ?? otp.isDisabled);
  const resolvedReadOnly = Boolean(readOnly ?? otp.isReadOnly);
  const char = otp.value[index] ?? "";

  const updateDigits = (nextDigits: string[]) => {
    otp.setValue(composeValue(nextDigits));
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(event);
    if (event.defaultPrevented || resolvedDisabled || resolvedReadOnly) {
      return;
    }

    const digit = event.target.value.replace(/\D/g, "").slice(-1);
    const digits = getDigits(otp.value, otp.length);
    digits[index] = digit;
    updateDigits(digits);

    if (digit && index < otp.length - 1) {
      otp.focusCell(index + 1);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || resolvedDisabled || resolvedReadOnly) {
      return;
    }

    if (event.key === "Backspace") {
      const digits = getDigits(otp.value, otp.length);
      if (!char && index > 0) {
        event.preventDefault();
        digits[index - 1] = "";
        updateDigits(digits);
        otp.focusCell(index - 1);
        return;
      }
      if (char) {
        digits[index] = "";
        updateDigits(digits);
      }
      return;
    }

    if (event.key === "Delete" && char) {
      const digits = getDigits(otp.value, otp.length);
      digits[index] = "";
      updateDigits(digits);
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      otp.focusCell(index - 1);
      return;
    }

    if (event.key === "ArrowRight" && index < otp.length - 1) {
      event.preventDefault();
      otp.focusCell(index + 1);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    onPaste?.(event);
    if (event.defaultPrevented || resolvedDisabled || resolvedReadOnly) {
      return;
    }

    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) {
      return;
    }

    const digits = getDigits(otp.value, otp.length);
    for (let offset = 0; offset < pasted.length; offset += 1) {
      const targetIndex = index + offset;
      if (targetIndex >= otp.length) {
        break;
      }
      digits[targetIndex] = pasted[offset] ?? "";
    }
    updateDigits(digits);
    otp.focusCell(Math.min(index + pasted.length, otp.length - 1));
  };

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    onFocus?.(event);
    event.target.select();
  };

  const resolvedAriaLabel =
    ariaLabel ?? (index === 0 ? undefined : `Digit ${index + 1}`);

  return {
    ...mergeProps(props, focusProps),
    ...fieldAria,
    ref: composeRefs(domRef, setCellRef, ref as Ref<HTMLInputElement>),
    id: index === 0 ? (id ?? field?.inputId) : id,
    type: "text",
    inputMode: "numeric",
    autoComplete: index === 0 ? (props.autoComplete ?? "one-time-code") : "off",
    maxLength: 1,
    value: char,
    disabled: resolvedDisabled,
    readOnly: resolvedReadOnly,
    required: otp.isRequired && index === 0 ? true : undefined,
    "aria-label": resolvedAriaLabel,
    "aria-invalid": otp.isInvalid || undefined,
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    onPaste: handlePaste,
    onFocus: handleFocus,
    "data-input": "",
    "data-input-control": "",
    "data-otp-field-input": "",
    "data-size": size,
    "data-disabled": resolvedDisabled ? "true" : undefined,
    "data-invalid": otp.isInvalid ? "true" : undefined,
    "data-focus-visible": isFocusVisible ? "true" : undefined,
    className: cn(inputStyles.input, className),
  } as OTPCellInputProps;
}
