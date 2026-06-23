import { cn } from "@dev-ui/core";
import type { CSSProperties } from "react";
import styles from "./overlay-arrow.module.scss";
import type { OverlayArrowProps } from "./overlay-arrow.types";

function getArrowStyle(
  placement: OverlayArrowProps["placement"],
): CSSProperties {
  const style: CSSProperties = {
    position: "absolute",
    transform:
      placement === "top" || placement === "bottom"
        ? "translateX(-50%) rotate(45deg)"
        : "translateY(-50%) rotate(45deg)",
  };

  if (
    placement === "top" ||
    placement === "bottom" ||
    placement === "left" ||
    placement === "right"
  ) {
    style[placement] = "100%";
  }

  return style;
}

function OverlayArrow({
  className,
  placement = "bottom",
  style,
  ...props
}: OverlayArrowProps) {
  return (
    <div
      {...props}
      data-overlay-arrow=""
      data-placement={placement ?? undefined}
      className={cn(styles.root, className)}
      style={{
        ...getArrowStyle(placement),
        ...style,
      }}
    />
  );
}

export type { OverlayArrowProps } from "./overlay-arrow.types";
export { OverlayArrow };
