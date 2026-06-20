import type {
  ColorSpace,
  ColorPickerProps as StatelyColorPickerProps,
} from "@react-stately/color";

export type ColorFormat = "hex" | "rgb" | "hsl" | "hsb";

export type ColorEditorProps = Omit<
  React.ComponentPropsWithoutRef<"div">,
  "defaultValue" | "onChange" | "color"
> &
  StatelyColorPickerProps & {
    colorFormat?: ColorFormat;
    showAlphaChannel?: boolean;
    showFormatSelector?: boolean;
  };

export type { ColorSpace };
