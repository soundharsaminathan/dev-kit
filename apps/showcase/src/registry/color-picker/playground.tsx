import {
  ColorPicker,
  type ColorPickerProps,
} from "@dev-ui/components/color-picker";

export default function ColorPickerPlayground({
  defaultOpen = false,
  ...props
}: ColorPickerProps = {}) {
  return <ColorPicker defaultOpen={defaultOpen} {...props} />;
}
