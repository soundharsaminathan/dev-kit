import { cn, composeRefs } from "@dev-ui/core";
import { useColorSwatch } from "@react-aria/color";
import { parseColor } from "@react-stately/color";
import { useMemo, useRef } from "react";
import { useColorPickerStateContext } from "../color-context";
import styles from "./color-swatch.module.scss";
import type { ColorSwatchProps } from "./types";

function ColorSwatch({
  ref,
  className,
  style,
  color,
  ...props
}: ColorSwatchProps) {
  const pickerState = useColorPickerStateContext();
  const resolvedColor = color ?? pickerState?.color;
  const parsedDefault = useMemo(
    () =>
      resolvedColor ? parseColor(String(resolvedColor)) : parseColor("#000"),
    [resolvedColor],
  );
  const domRef = useRef<HTMLDivElement>(null);
  const swatchOptions = {
    ...props,
    color: parsedDefault,
  };
  const { colorSwatchProps, color: parsedColor } =
    useColorSwatch(swatchOptions);
  const swatchColor = parsedColor.toString("css");

  return (
    <div
      {...colorSwatchProps}
      ref={composeRefs(domRef, ref)}
      data-slot="color-swatch"
      className={cn(styles.swatch, className)}
      style={{
        ...(colorSwatchProps.style as React.CSSProperties | undefined),
        background: `linear-gradient(${swatchColor}, ${swatchColor}), repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 50% / 16px 16px`,
        ...style,
      }}
    />
  );
}

export type { ColorSwatchProps } from "./types";
export { ColorSwatch };
