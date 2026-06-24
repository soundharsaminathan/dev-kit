import { ColorArea } from "@dev-ui/components/color-area";

type ColorThumbPlaygroundProps = {
  "aria-label"?: string;
  defaultValue?: string;
  isDisabled?: boolean;
};

export default function ColorThumbPlayground({
  "aria-label": ariaLabel = "Saturation and brightness",
  defaultValue = "#6366f1",
  isDisabled = false,
}: ColorThumbPlaygroundProps = {}) {
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
