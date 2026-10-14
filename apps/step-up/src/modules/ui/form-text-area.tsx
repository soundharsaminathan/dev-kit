import { Field, Label } from "@dev-ui/components/field";
import { TextArea } from "@dev-ui/components/text-area";
import type { TextareaHTMLAttributes } from "react";
import styles from "./form-input.module.scss";

type FormTextAreaProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isDisabled?: boolean;
  required?: boolean;
} & Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "onChange" | "size"
>;

export function FormTextArea({
  label,
  value,
  onChange,
  disabled,
  isDisabled,
  required,
  rows = 3,
  ...props
}: FormTextAreaProps) {
  const resolvedDisabled = Boolean(disabled ?? isDisabled);
  return (
    <Field>
      <Label>
        {label}
        {required ? (
          <span className={styles.required} aria-hidden="true">
            {" "}
            *
          </span>
        ) : null}
      </Label>
      <TextArea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={resolvedDisabled}
        required={required}
        rows={rows}
        {...props}
      />
    </Field>
  );
}
