import { Description, Label } from "@dev-ui/components/field";
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@dev-ui/components/number-field";

type NumberFieldPlaygroundProps = {
  "aria-label"?: string;
  defaultValue?: number;
  minValue?: number;
  maxValue?: number;
  step?: number;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isRequired?: boolean;
  showLabel?: boolean;
  labelText?: string;
  descriptionText?: string;
  inputSize?: "sm" | "md" | "lg";
};

export default function NumberFieldPlayground({
  showLabel = false,
  labelText = "Quantity",
  descriptionText = "Choose how many items to order.",
  inputSize = "md",
  "aria-label": ariaLabel = "Quantity",
  defaultValue = 5,
  minValue = 0,
  maxValue = 100,
  step = 1,
  isDisabled = false,
  isInvalid = false,
  isRequired = false,
}: NumberFieldPlaygroundProps = {}) {
  const fieldProps = {
    "aria-label": ariaLabel,
    defaultValue,
    minValue,
    maxValue,
    step,
    isDisabled,
    isInvalid,
    isRequired,
  };

  return showLabel ? (
    <NumberField {...fieldProps}>
      <Label>{labelText}</Label>
      <Description>{descriptionText}</Description>
      <NumberFieldGroup>
        <NumberFieldDecrement />
        <NumberFieldInput size={inputSize} />
        <NumberFieldIncrement />
      </NumberFieldGroup>
    </NumberField>
  ) : (
    <NumberField {...fieldProps} />
  );
}
