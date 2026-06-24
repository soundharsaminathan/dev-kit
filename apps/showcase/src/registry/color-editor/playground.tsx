import { ColorEditor } from "@dev-ui/components/color-editor";

type ColorEditorPlaygroundProps = {
  defaultValue?: string;
  colorFormat?: "hex" | "rgb" | "hsl" | "hsb";
  showAlphaChannel?: boolean;
  showFormatSelector?: boolean;
};

export default function ColorEditorPlayground({
  defaultValue = "#6366f1",
  colorFormat = "hex",
  showAlphaChannel = false,
  showFormatSelector = true,
}: ColorEditorPlaygroundProps = {}) {
  return (
    <ColorEditor
      defaultValue={defaultValue}
      colorFormat={colorFormat}
      showAlphaChannel={showAlphaChannel}
      showFormatSelector={showFormatSelector}
    />
  );
}
