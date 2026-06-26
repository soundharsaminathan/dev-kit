import {
  COLOR_SWATCH_PICKER_PRESETS,
  ColorSwatchPicker,
  ColorSwatchPickerItem,
  type ColorSwatchPickerProps,
} from "@dev-ui/components/color-swatch-picker";

export default function ColorSwatchPickerPlayground({
  isDisabled = false,
  ...props
}: ColorSwatchPickerProps = {}) {
  return (
    <ColorSwatchPicker
      aria-label="Preset colors"
      defaultValue={COLOR_SWATCH_PICKER_PRESETS[0]}
      isDisabled={isDisabled}
      {...props}
    >
      {COLOR_SWATCH_PICKER_PRESETS.map((color) => (
        <ColorSwatchPickerItem key={color} color={color} />
      ))}
    </ColorSwatchPicker>
  );
}
