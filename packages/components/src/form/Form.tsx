import { cn, composeRefs } from "@dev-ui/core";
import { FormValidationContext } from "@react-stately/form";
import { useRef } from "react";
import styles from "./form.module.scss";
import type { FormProps } from "./form.types";

function Form({
  ref,
  className,
  validationBehavior = "native",
  validationErrors,
  children,
  ...props
}: FormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      {...props}
      ref={composeRefs(formRef, ref)}
      noValidate={validationBehavior !== "native"}
      data-form=""
      className={cn(styles.root, className)}
    >
      <FormValidationContext.Provider value={validationErrors ?? {}}>
        {children}
      </FormValidationContext.Provider>
    </form>
  );
}

export type { FormProps } from "./form.types";
export { Form };
