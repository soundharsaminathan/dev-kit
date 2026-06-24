import { Slider } from "@dev-ui/components/slider";

type SliderPlaygroundProps = {
  "aria-label"?: string;
  defaultValue?: number;
  minValue?: number;
  maxValue?: number;
  step?: number;
  orientation?: "horizontal" | "vertical";
  isDisabled?: boolean;
};

export default function SliderPlayground({
  "aria-label": ariaLabel = "Volume",
  defaultValue = 50,
  minValue = 0,
  maxValue = 100,
  step = 1,
  orientation = "horizontal",
  isDisabled = false,
}: SliderPlaygroundProps = {}) {
  return (
    <Slider
      aria-label={ariaLabel}
      defaultValue={defaultValue}
      minValue={minValue}
      maxValue={maxValue}
      step={step}
      orientation={orientation}
      isDisabled={isDisabled}
    />
  );
}
