import { Field, Label } from "@dev-ui/components/field";
import { Input } from "@dev-ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@dev-ui/components/select";
import { Switch } from "@dev-ui/components/switch";
import { TextField } from "@dev-ui/components/text-field";
import styles from "./controls.module.scss";
import type { ControlValues, SerializableControl } from "./types";

interface ControlsProps {
  controls: SerializableControl[];
  values: ControlValues;
  onChange: (name: string, value: unknown) => void;
}

function formatLabel(name: string): string {
  if (name === "children") return "Label";
  if (name === "aria-label") return "Aria label";
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

export function Controls({ controls, values, onChange }: ControlsProps) {
  return (
    <div className={styles.list}>
      {controls.map((control) => (
        <ControlField
          key={control.name}
          control={control}
          value={values[control.name]}
          onChange={(value) => onChange(control.name, value)}
        />
      ))}
    </div>
  );
}

function ControlField({
  control,
  value,
  onChange,
}: {
  control: SerializableControl;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const label = formatLabel(control.name);

  if (control.type === "boolean") {
    return (
      <Field>
        <Switch
          isSelected={Boolean(value)}
          onChange={(selected) => onChange(selected)}
        >
          {label}
        </Switch>
      </Field>
    );
  }

  if (control.type === "string") {
    return (
      <TextField>
        <Label>{label}</Label>
        <Input
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
          placeholder={control.placeholder}
        />
      </TextField>
    );
  }

  if (control.type === "number") {
    return (
      <TextField>
        <Label>{label}</Label>
        <Input
          type="number"
          value={Number(value ?? 0)}
          onChange={(event) => onChange(Number(event.target.value))}
          min={control.min}
          max={control.max}
          step={control.step}
        />
      </TextField>
    );
  }

  if (control.type === "enum") {
    const selectedValue = String(
      value ?? control.defaultValue ?? control.options[0],
    );
    return (
      <Select value={selectedValue} onChange={(key) => onChange(String(key))}>
        <Label>{label}</Label>
        <SelectTrigger />
        <SelectContent>
          {control.options.map((option) => (
            <SelectItem key={option} id={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return null;
}
