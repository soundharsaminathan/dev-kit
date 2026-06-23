import { ColorSlider } from "@dev-ui/components/color-slider";
import {
  type ColorSliderChannel,
  type ColorSliderColorSpace,
  normalizeColorSliderChannel,
} from "./normalize";

type ColorSliderPlaygroundProps = {
  defaultValue?: string;
  channel?: ColorSliderChannel;
  colorSpace?: ColorSliderColorSpace;
  "aria-label"?: string;
  orientation?: "horizontal" | "vertical";
  isDisabled?: boolean;
};

export default function ColorSliderPlayground({
  defaultValue = "#6366f1",
  channel = "hue",
  colorSpace = "hsb",
  "aria-label": ariaLabel = "Hue",
  orientation = "horizontal",
  isDisabled = false,
}: ColorSliderPlaygroundProps = {}) {
  const resolvedChannel = normalizeColorSliderChannel(channel, colorSpace);

  return (
    <ColorSlider
      defaultValue={defaultValue}
      channel={resolvedChannel}
      colorSpace={colorSpace}
      aria-label={ariaLabel}
      orientation={orientation}
      isDisabled={isDisabled}
    />
  );
}
