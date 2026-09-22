import { Alert, AlertDescription } from "@dev-ui/components/alert";
import { Button } from "@dev-ui/components/button";
import { Checkbox } from "@dev-ui/components/checkbox";
import { Label } from "@dev-ui/components/field";
import { FileTrigger } from "@dev-ui/components/file-trigger";
import { Input } from "@dev-ui/components/input";
import { InputGroup, InputGroupAddon } from "@dev-ui/components/input-group";
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@dev-ui/components/number-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@dev-ui/components/select";
import { TextArea } from "@dev-ui/components/text-area";
import { TextField } from "@dev-ui/components/text-field";
import { Icon } from "@dev-ui/icons";
import { type ComponentProps, useState } from "react";

const EMPTY_OPTION = "__empty";

type TextControlProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isRequired?: boolean | undefined;
} & Omit<ComponentProps<typeof Input>, "value" | "onChange" | "required">;

export function TextControl({
  label,
  value,
  onChange,
  isRequired,
  type = "text",
  ...inputProps
}: TextControlProps) {
  return (
    <TextField>
      {label ? (
        <Label {...(isRequired ? { "data-required": "true" } : {})}>
          {label}
        </Label>
      ) : null}
      <Input
        type={type}
        value={value}
        required={isRequired}
        aria-label={label || undefined}
        onChange={(event) => onChange(event.target.value)}
        {...inputProps}
      />
    </TextField>
  );
}

type PasswordControlProps = {
  label?: string | undefined;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string | undefined;
  isRequired?: boolean | undefined;
  name?: string | undefined;
};

export function PasswordControl({
  label = "Password",
  value,
  onChange,
  autoComplete = "current-password",
  isRequired,
  name,
}: PasswordControlProps) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField>
      <Label {...(isRequired ? { "data-required": "true" } : {})}>{label}</Label>
      <InputGroup>
        <Input
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          required={isRequired}
          onChange={(event) => onChange(event.target.value)}
        />
        <InputGroupAddon>
          <Button
            type="button"
            variant="quiet"
            isIconOnly
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            onClick={() => setVisible((current) => !current)}
          >
            <Icon name={visible ? "eye-off" : "eye"} />
          </Button>
        </InputGroupAddon>
      </InputGroup>
    </TextField>
  );
}

type AreaControlProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number | undefined;
  isRequired?: boolean | undefined;
};

export function AreaControl({
  label,
  value,
  onChange,
  rows = 3,
  isRequired,
}: AreaControlProps) {
  return (
    <TextField>
      <Label {...(isRequired ? { "data-required": "true" } : {})}>{label}</Label>
      <TextArea
        rows={rows}
        value={value}
        required={isRequired}
        onChange={(event) => onChange(event.target.value)}
      />
    </TextField>
  );
}

type NumberControlProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minValue?: number | undefined;
  step?: number | undefined;
  isRequired?: boolean | undefined;
};

function fractionDigits(step?: number) {
  if (step == null || step >= 1) return 0;
  const text = String(step);
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
}

export function NumberControl({
  label,
  value,
  onChange,
  minValue,
  step,
  isRequired,
}: NumberControlProps) {
  const numeric = value.trim() === "" ? Number.NaN : Number(value);

  return (
    <NumberField
      value={numeric}
      {...(minValue !== undefined ? { minValue } : {})}
      {...(step !== undefined ? { step } : {})}
      {...(isRequired ? { isRequired: true } : {})}
      formatOptions={{
        useGrouping: false,
        maximumFractionDigits: fractionDigits(step),
      }}
      onChange={(next) => {
        onChange(Number.isNaN(next) ? "" : String(next));
      }}
    >
      <Label {...(isRequired ? { "data-required": "true" } : {})}>{label}</Label>
      <NumberFieldGroup>
        <NumberFieldDecrement />
        <NumberFieldInput />
        <NumberFieldIncrement />
      </NumberFieldGroup>
    </NumberField>
  );
}

export type ChoiceOption = {
  id: string;
  label: string;
};

type ChoiceControlProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly ChoiceOption[];
  placeholder?: string | undefined;
  emptyLabel?: string | undefined;
  isRequired?: boolean | undefined;
  description?: string | undefined;
};

export function ChoiceControl({
  label,
  value,
  onChange,
  options,
  placeholder,
  emptyLabel,
  isRequired,
  description,
}: ChoiceControlProps) {
  const items = emptyLabel
    ? [{ id: EMPTY_OPTION, label: emptyLabel }, ...options]
    : options;

  return (
    <Select
      selectedKey={value || (emptyLabel ? EMPTY_OPTION : null)}
      {...(placeholder !== undefined ? { placeholder } : {})}
      {...(isRequired ? { isRequired: true } : {})}
      {...(description !== undefined ? { description } : {})}
      onSelectionChange={(key) => {
        if (key == null) return;
        const next = String(key);
        onChange(next === EMPTY_OPTION ? "" : next);
      }}
    >
      <Label {...(isRequired ? { "data-required": "true" } : {})}>{label}</Label>
      <SelectTrigger />
      <SelectContent>
        {items.map((option) => (
          <SelectItem key={option.id} id={option.id}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type CheckControlProps = {
  label: string;
  isSelected: boolean;
  onChange: (selected: boolean) => void;
};

export function CheckControl({
  label,
  isSelected,
  onChange,
}: CheckControlProps) {
  return (
    <Checkbox isSelected={isSelected} onChange={onChange}>
      {label}
    </Checkbox>
  );
}

type FileControlProps = {
  label: string;
  fileName?: string | null | undefined;
  onSelect: (file: File | null) => void;
};

export function FileControl({ label, fileName, onSelect }: FileControlProps) {
  return (
    <TextField>
      <Label>{label}</Label>
      <FileTrigger
        onSelect={(files) => onSelect(files?.item(0) ?? null)}
        allowsClearing
        clearLabel="Clear file"
      >
        <Button type="button" variant="outline">
          <Icon name="upload" />
          {fileName || "Choose file"}
        </Button>
      </FileTrigger>
    </TextField>
  );
}

export function FormError({ children }: { children: string }) {
  return (
    <Alert variant="danger">
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}

export function FormSuccess({ children }: { children: string }) {
  return (
    <Alert variant="success">
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}

export const FREQUENCY_OPTIONS: readonly ChoiceOption[] = [
  { id: "WEEKLY", label: "Weekly" },
  { id: "BIWEEKLY", label: "Bi-Weekly" },
  { id: "MONTHLY", label: "Monthly" },
];

export const FIRST_EMI_OPTIONS: readonly ChoiceOption[] = [
  { id: "EXACT_DAY", label: "Exact day" },
  { id: "CONVERT_TO_1ST_PARTIAL", label: "Convert to 1st + partial" },
  { id: "CONVERT_TO_1ST_NEXT_MONTH", label: "Convert to 1st next month" },
];
