import { ColorArea } from "@dev-ui/components/color-area";

type ColorAreaPlaygroundProps = {
  "aria-label"?: string;
  defaultValue?: string;
  isDisabled?: boolean;
};

export default function ColorAreaPlayground({
  "aria-label": ariaLabel = "Saturation and brightness",
  defaultValue = "#6366f1",
  isDisabled = false,
}: ColorAreaPlaygroundProps = {}) {
  return (
    <ColorArea
      aria-label={ariaLabel}
      defaultValue={defaultValue}
      colorSpace="hsb"
      xChannel="saturation"
      yChannel="brightness"
      isDisabled={isDisabled}
    />
  );
}
