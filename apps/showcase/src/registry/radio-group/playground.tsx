import { Radio, RadioGroup } from "@dev-ui/components/radio-group";

type RadioGroupPlaygroundProps = {
  label?: string;
  description?: string;
  errorMessage?: string;
  defaultValue?: string;
  orientation?: "horizontal" | "vertical";
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
};

export default function RadioGroupPlayground({
  label = "Plan",
  description,
  errorMessage,
  defaultValue = "free",
  orientation = "vertical",
  isDisabled = false,
  isReadOnly = false,
  isRequired = false,
  isInvalid = false,
}: RadioGroupPlaygroundProps = {}) {
  return (
    <RadioGroup
      label={label}
      description={description}
      errorMessage={errorMessage}
      defaultValue={defaultValue}
      orientation={orientation}
      isDisabled={isDisabled}
      isReadOnly={isReadOnly}
      isRequired={isRequired}
      isInvalid={isInvalid}
    >
      <Radio value="free">Free</Radio>
      <Radio value="pro">Pro</Radio>
      <Radio value="enterprise">Enterprise</Radio>
    </RadioGroup>
  );
}
