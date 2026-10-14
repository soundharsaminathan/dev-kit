import {
  AreaControl,
  CheckControl,
  ChoiceControl,
  DateControl,
  FileControl,
  NumberControl,
  PasswordControl,
  TextControl,
} from "@/modules/ui/controls";
import type { InputHTMLAttributes } from "react";

type FormInputProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "size">;

export function FormInput({
  label = "",
  value,
  onChange,
  type = "text",
  required,
  min,
  step,
  ...props
}: FormInputProps) {
  if (type === "number") {
    return (
      <NumberControl
        label={label}
        value={value}
        onChange={onChange}
        {...(required ? { isRequired: true } : {})}
        {...(min == null || min === "" ? {} : { minValue: Number(min) })}
        {...(step == null || step === "" ? {} : { step: Number(step) })}
      />
    );
  }

  if (type === "date") {
    return (
      <DateControl
        label={label}
        value={value}
        onChange={onChange}
        {...(required ? { isRequired: true } : {})}
      />
    );
  }

  return (
    <TextControl
      label={label}
      value={value}
      onChange={onChange}
      type={type}
      {...(required ? { isRequired: true } : {})}
      {...props}
    />
  );
}

export function FormPassword(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
  name?: string;
}) {
  return (
    <PasswordControl
      label={props.label}
      value={props.value}
      onChange={props.onChange}
      {...(props.autoComplete !== undefined
        ? { autoComplete: props.autoComplete }
        : {})}
      {...(props.required ? { isRequired: true } : {})}
      {...(props.name !== undefined ? { name: props.name } : {})}
    />
  );
}

export function FormTextArea(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  rows?: number;
}) {
  return (
    <AreaControl
      label={props.label}
      value={props.value}
      onChange={props.onChange}
      {...(props.required ? { isRequired: true } : {})}
      {...(props.rows !== undefined ? { rows: props.rows } : {})}
    />
  );
}

export function FormSelect(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <ChoiceControl
      label={props.label}
      value={props.value}
      onChange={props.onChange}
      options={props.options.map((option) => ({
        id: option.value,
        label: option.label,
      }))}
      {...(props.placeholder !== undefined
        ? { placeholder: props.placeholder }
        : {})}
      {...(props.required ? { isRequired: true } : {})}
    />
  );
}

export { FormError, FormSuccess } from "@/modules/ui/controls";

export function FormCheckbox(props: {
  label: string;
  isSelected: boolean;
  onChange: (selected: boolean) => void;
}) {
  return <CheckControl {...props} />;
}

export function FormFile(props: {
  label: string;
  onChange: (file: File | null) => void;
}) {
  return (
    <FileControl label={props.label} onSelect={props.onChange} />
  );
}
