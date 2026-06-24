import { ColorField } from "@dev-ui/components/color-field";

type ColorFieldPlaygroundProps = {
  "aria-label"?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
};

export default function ColorFieldPlayground({
  "aria-label": ariaLabel = "Hex",
  isDisabled = false,
  isInvalid = false,
}: ColorFieldPlaygroundProps = {}) {
  return (
    <ColorField
      aria-label={ariaLabel}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
    />
  );
}
