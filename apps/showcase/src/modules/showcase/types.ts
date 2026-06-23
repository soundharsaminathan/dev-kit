export interface BooleanControl {
  name: string;
  type: "boolean";
  defaultValue?: boolean;
}

export interface StringControl {
  name: string;
  type: "string";
  defaultValue?: string;
  placeholder?: string;
}

export interface NumberControl {
  name: string;
  type: "number";
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
}

export interface EnumControl {
  name: string;
  type: "enum";
  options: readonly string[];
  defaultValue?: string;
}

export type SerializableControl =
  | BooleanControl
  | StringControl
  | NumberControl
  | EnumControl;

export type ControlValues = Record<string, unknown>;

export function defaultControlValues(
  controls: SerializableControl[],
): ControlValues {
  const values: ControlValues = {};
  for (const control of controls) {
    if ("defaultValue" in control && control.defaultValue !== undefined) {
      values[control.name] = control.defaultValue;
    } else if (control.type === "boolean") {
      values[control.name] = false;
    } else if (control.type === "string") {
      values[control.name] = "";
    } else if (control.type === "number") {
      values[control.name] = 0;
    } else if (control.type === "enum" && control.options.length > 0) {
      values[control.name] = control.options[0];
    }
  }
  return values;
}
