import { Button, type ButtonProps } from "@dev-ui/components/button";
import type { ElementType, ReactNode } from "react";
import styles from "./touch-button.module.scss";

type TouchButtonProps<C extends ElementType = "button"> = ButtonProps<C> & {
  fullWidth?: boolean;
};

export function TouchButton<C extends ElementType = "button">({
  className,
  fullWidth,
  size = "lg",
  ...props
}: TouchButtonProps<C>) {
  const classes = [styles.touch, fullWidth ? styles.fullWidth : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <Button size={size} className={classes} {...(props as ButtonProps<C>)} />
  );
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
