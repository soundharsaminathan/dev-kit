import { ColorWheel } from "@dev-ui/components/color-wheel";

type ColorWheelPlaygroundProps = {
  "aria-label"?: string;
  isDisabled?: boolean;
};

export default function ColorWheelPlayground({
  "aria-label": ariaLabel = "Hue",
  isDisabled = false,
}: ColorWheelPlaygroundProps = {}) {
  return (
    <ColorWheel
      aria-label={ariaLabel}
      defaultValue="#6366f1"
      isDisabled={isDisabled}
    />
  );
}
