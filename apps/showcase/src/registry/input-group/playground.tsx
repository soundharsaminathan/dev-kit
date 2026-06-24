import { Input } from "@dev-ui/components/input";
import { InputGroup, InputGroupAddon } from "@dev-ui/components/input-group";

type InputGroupPlaygroundProps = {
  size?: "sm" | "md" | "lg";
  isDisabled?: boolean;
  isInvalid?: boolean;
  addonPosition?: "leading" | "trailing";
  addonText?: string;
  placeholder?: string;
  ariaLabel?: string;
};

export default function InputGroupPlayground({
  size = "md",
  isDisabled = false,
  isInvalid = false,
  addonPosition = "leading",
  addonText = "https://",
  placeholder = "example.com",
  ariaLabel = "Website",
}: InputGroupPlaygroundProps = {}) {
  return (
    <InputGroup size={size} isDisabled={isDisabled} isInvalid={isInvalid}>
      {addonPosition === "leading" ? (
        <InputGroupAddon>{addonText}</InputGroupAddon>
      ) : null}
      <Input placeholder={placeholder} aria-label={ariaLabel} />
      {addonPosition === "trailing" ? (
        <InputGroupAddon>{addonText}</InputGroupAddon>
      ) : null}
    </InputGroup>
  );
}
