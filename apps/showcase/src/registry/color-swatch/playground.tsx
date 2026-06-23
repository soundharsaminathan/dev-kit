import { ColorSwatch } from "@dev-ui/components/color-swatch";

type ColorSwatchPlaygroundProps = {
  color?: string;
};

export default function ColorSwatchPlayground({
  color = "#6366f1",
}: ColorSwatchPlaygroundProps = {}) {
  return <ColorSwatch color={color} />;
}
