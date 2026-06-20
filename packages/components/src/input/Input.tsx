import { cn, composeRefs } from "@dev-ui/core";
import { useFocusRing } from "@react-aria/focus";
import { mergeProps } from "@react-aria/utils";
import { useRef } from "react";
import { useFieldContext, useFieldInputAria } from "../field/field-context";
import {
  useOTPFieldCellProps,
  useOTPFieldContext,
} from "../otp-field/otp-field-context";
import styles from "./input.module.scss";
import type { InputProps } from "./input.types";

function OTPInput(props: InputProps) {
  const otpCellProps = useOTPFieldCellProps(props);
  if (!otpCellProps) {
    return null;
  }

  const { ref, ...inputProps } = otpCellProps;
  return <input {...inputProps} ref={ref} />;
}

function RegularInput({
  ref,
  size = "md",
  isDisabled,
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-errormessage": ariaErrorMessage,
  className,
  disabled,
  ...props
}: InputProps) {
  const domRef = useRef<HTMLInputElement>(null);
  const field = useFieldContext();
  const resolvedDisabled = Boolean(disabled ?? isDisabled);
  const { focusProps, isFocusVisible } = useFocusRing({
    isTextInput: true,
  });

  const describedBy = ariaDescribedBy || undefined;
  const fieldAria = useFieldInputAria({
    "aria-describedby": describedBy,
    "aria-errormessage": ariaErrorMessage,
  });

  return (
    <input
      {...mergeProps(props, focusProps)}
      {...fieldAria}
      ref={composeRefs(domRef, ref)}
      id={id ?? field?.inputId}
      disabled={resolvedDisabled}
      data-input=""
      data-input-control=""
      data-size={size}
      data-disabled={resolvedDisabled ? "true" : undefined}
      data-focus-visible={isFocusVisible ? "true" : undefined}
      className={cn(styles.input, className)}
    />
  );
}

function Input(props: InputProps) {
  const otp = useOTPFieldContext();
  if (otp) {
    return <OTPInput {...props} />;
  }
  return <RegularInput {...props} />;
}

export type { InputProps, InputSize } from "./input.types";
export { Input };
