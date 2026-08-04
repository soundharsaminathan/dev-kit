import type { CSSProperties } from "react";
import { type DanceStyle, resolveDanceStyle } from "@/lib/dance-styles";
import { useStudioDanceStyles } from "@/lib/use-studio-dance-styles";
import styles from "./styles.module.scss";

type StyleIconProps = {
  style: string;
  size?: "xs" | "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
  catalog?: DanceStyle[];
};

export function StyleIcon({
  style,
  size = "md",
  showLabel = false,
  className,
  catalog: catalogProp,
}: StyleIconProps) {
  const { styles: studioStyles } = useStudioDanceStyles();
  const catalog = catalogProp ?? studioStyles;
  const resolved = resolveDanceStyle(style, catalog);
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
