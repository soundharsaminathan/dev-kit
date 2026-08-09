import { Field, Label } from "@dev-ui/components/field";
import { TextArea } from "@dev-ui/components/text-area";
import type { TextareaHTMLAttributes } from "react";

type FormTextAreaProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isDisabled?: boolean;
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
  rows = 3,
  ...props
}: FormTextAreaProps) {
  const resolvedDisabled = Boolean(disabled ?? isDisabled);
  return (
    <Field>
      <Label>{label}</Label>
      <TextArea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={resolvedDisabled}
        rows={rows}
        {...props}
      />
    </Field>
  );
}
