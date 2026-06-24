import { Description, FieldError, Label } from "@dev-ui/components/field";
import { Input } from "@dev-ui/components/input";
import { TextField } from "@dev-ui/components/text-field";

type TextFieldPlaygroundProps = {
  orientation?: "horizontal" | "vertical";
  label?: string;
  placeholder?: string;
  showDescription?: boolean;
  description?: string;
  showError?: boolean;
  errorMessage?: string;
};

export default function TextFieldPlayground({
  orientation = "vertical",
  label = "Email",
  placeholder = "you@example.com",
  showDescription = true,
  description = "We will send updates to this address.",
  showError = false,
  errorMessage = "Email is required",
}: TextFieldPlaygroundProps = {}) {
  return (
    <TextField orientation={orientation}>
      <Label>{label}</Label>
      {showDescription ? <Description>{description}</Description> : null}
      <Input placeholder={placeholder} />
      {showError ? <FieldError>{errorMessage}</FieldError> : null}
    </TextField>
  );
}
