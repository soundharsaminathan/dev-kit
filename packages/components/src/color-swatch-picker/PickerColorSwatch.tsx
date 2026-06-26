import { cn } from "@dev-ui/core";
import type { Color } from "@react-stately/color";
import styles from "./color-swatch-picker.module.scss";

function PickerColorSwatch({
  color,
  className,
}: {
  color: Color;
  className?: string;
}) {
  const css = color.toString("css");

  return (
    <div
      aria-hidden="true"
      data-slot="color-swatch"
      className={cn(styles.swatch, className)}
      style={{
        background: `linear-gradient(${css}, ${css}), repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 50% / 16px 16px`,
      }}
    />
  );
}

export { PickerColorSwatch };
