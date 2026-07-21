import type { CSSProperties } from "react";
import { resolveDanceStyle } from "@/lib/dance-styles";
import styles from "./styles.module.scss";

type StyleIconProps = {
  style: string;
  size?: "xs" | "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
};

export function StyleIcon({
  style,
  size = "md",
  showLabel = false,
  className,
}: StyleIconProps) {
  const resolved = resolveDanceStyle(style);
  const sizeClass =
    size === "xs"
      ? styles.iconXs
      : size === "sm"
        ? styles.iconSm
        : size === "lg"
          ? styles.iconLg
          : styles.iconMd;
  const rootClass = [styles.iconWrap, className].filter(Boolean).join(" ");

  return (
    <span className={rootClass} title={resolved.label}>
      <span
        className={`${styles.icon} ${sizeClass}`}
        style={
          {
            "--style-color": resolved.color,
            "--style-fg":
              resolved.id === "breaking" ? "#ffffff" : "rgba(255,255,255,0.96)",
          } as CSSProperties
        }
        aria-hidden={showLabel ? undefined : true}
      >
        {resolved.abbrev}
      </span>
      {showLabel ? (
        <span className={styles.iconLabel}>{resolved.label}</span>
      ) : null}
    </span>
  );
}
