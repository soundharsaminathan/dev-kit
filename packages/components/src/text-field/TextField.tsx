import { Field } from "../field/Field";
import type { TextFieldProps } from "./text-field.types";

function TextField({ className, ...props }: TextFieldProps) {
  return (
    <Field
      data-field=""
      data-textfield=""
      data-slot="text-field"
      className={className}
      {...props}
    />
  );
}

export type { TextFieldProps } from "./text-field.types";
export { TextField };
