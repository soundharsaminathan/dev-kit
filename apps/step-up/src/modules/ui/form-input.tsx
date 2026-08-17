import { Label } from "@dev-ui/components/field";
import { Input } from "@dev-ui/components/input";
import { TextField } from "@dev-ui/components/text-field";
import type { InputHTMLAttributes } from "react";
import styles from "./form-input.module.scss";

type FormInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isDisabled?: boolean;
  required?: boolean;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "size">;

export function FormInput({
  label,
  value,
  onChange,
  type = "text",
  disabled,
  isDisabled,
  readOnly,
  required,
  ...props
}: FormInputProps) {
  const resolvedDisabled = Boolean(disabled ?? isDisabled);
  return (
    <TextField>
      <Label>
        {label}
        {required ? (
          <span className={styles.required} aria-hidden="true">
            {" "}
            *
          </span>
        ) : null}
      </Label>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={resolvedDisabled}
        readOnly={readOnly}
        required={required}
        {...props}
      />
    </TextField>
  );
}
