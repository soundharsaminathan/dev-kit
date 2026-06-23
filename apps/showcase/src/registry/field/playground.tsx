import {
  Description,
  Field,
  FieldError,
  Label,
} from "@dev-ui/components/field";
import { Input } from "@dev-ui/components/input";

type FieldPlaygroundProps = {
  orientation?: "horizontal" | "vertical";
  labelText?: string;
  descriptionText?: string;
  placeholder?: string;
  errorMessage?: string;
  showError?: boolean;
};

export default function FieldPlayground({
  orientation = "vertical",
  labelText = "Email",
  descriptionText = "We will send updates to this address.",
  placeholder = "you@example.com",
  errorMessage = "Email is required",
  showError = false,
}: FieldPlaygroundProps = {}) {
  return (
    <Field orientation={orientation}>
      <Label>{labelText}</Label>
      {showError ? null : <Description>{descriptionText}</Description>}
      <Input placeholder={placeholder} />
      {showError ? <FieldError>{errorMessage}</FieldError> : null}
    </Field>
  );
}
