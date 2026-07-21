import { Button, type ButtonProps } from "@dev-ui/components/button";
import type { ReactNode } from "react";
import styles from "./touch-button.module.scss";

type TouchButtonProps = ButtonProps & {
  fullWidth?: boolean;
};

export function TouchButton({
  className,
  fullWidth,
  size = "lg",
  ...props
}: TouchButtonProps) {
  const classes = [styles.touch, fullWidth ? styles.fullWidth : "", className]
    .filter(Boolean)
    .join(" ");

  return <Button size={size} className={classes} {...props} />;
}

type StickyCtaBarProps = {
  children: ReactNode;
  secondary?: ReactNode;
};

export function StickyCtaBar({ children, secondary }: StickyCtaBarProps) {
  return (
    <div className={styles.bar}>
      {secondary ? <div className={styles.secondary}>{secondary}</div> : null}
      <div className={styles.primary}>{children}</div>
    </div>
  );
}
