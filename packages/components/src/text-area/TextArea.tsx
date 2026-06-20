import { cn, composeRefs } from "@dev-ui/core";
import { useFocusRing } from "@react-aria/focus";
import { mergeProps } from "@react-aria/utils";
import { useRef } from "react";
import { useFieldContext, useFieldInputAria } from "../field/field-context";
import styles from "./text-area.module.scss";
import type { TextAreaProps } from "./text-area.types";

function TextArea({
  ref,
  size = "md",
  isDisabled,
  id,
  rows = 3,
  "aria-describedby": ariaDescribedBy,
  "aria-errormessage": ariaErrorMessage,
  className,
  disabled,
  ...props
}: TextAreaProps) {
  const domRef = useRef<HTMLTextAreaElement>(null);
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
    <textarea
      {...mergeProps(props, focusProps)}
      {...fieldAria}
      ref={composeRefs(domRef, ref)}
      id={id ?? field?.inputId}
      rows={rows}
      disabled={resolvedDisabled}
      data-textarea=""
      data-input-control=""
      data-size={size}
      data-disabled={resolvedDisabled ? "true" : undefined}
      data-focus-visible={isFocusVisible ? "true" : undefined}
      className={cn(styles.textArea, className)}
    />
  );
}

export type { TextAreaProps } from "./text-area.types";
export { TextArea };
