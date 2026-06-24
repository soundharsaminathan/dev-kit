import {
  ColorSwatchPicker,
  type ColorSwatchPickerProps,
} from "@dev-ui/components/color-swatch-picker";

export default function ColorSwatchPickerPlayground({
  isDisabled = false,
  ...props
}: ColorSwatchPickerProps = {}) {
  return <ColorSwatchPicker isDisabled={isDisabled} {...props} />;
}
