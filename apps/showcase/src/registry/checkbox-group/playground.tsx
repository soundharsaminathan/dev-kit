import { Checkbox } from "@dev-ui/components/checkbox";
import { CheckboxGroup } from "@dev-ui/components/checkbox-group";

type CheckboxGroupPlaygroundProps = {
  "aria-label"?: string;
  description?: string;
  errorMessage?: string;
  defaultValue?: string | string[];
  isDisabled?: boolean;
  isInvalid?: boolean;
};

export default function CheckboxGroupPlayground({
  "aria-label": ariaLabel = "Notifications",
  description,
  errorMessage,
  defaultValue: defaultValueProp = ["email"],
  isDisabled = false,
  isInvalid = false,
}: CheckboxGroupPlaygroundProps = {}) {
  const defaultValue =
    typeof defaultValueProp === "string"
      ? defaultValueProp.split(",").map((value) => value.trim())
      : defaultValueProp;

  return (
    <CheckboxGroup
      aria-label={ariaLabel}
      description={description}
      errorMessage={errorMessage}
      defaultValue={defaultValue}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
    >
      <Checkbox value="email">Email</Checkbox>
      <Checkbox value="sms">SMS</Checkbox>
      <Checkbox value="push">Push notifications</Checkbox>
    </CheckboxGroup>
  );
}
