import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./pressable-card.module.scss";

type PressableCardProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  asDiv?: boolean;
};

export function PressableCard({
  children,
  className,
  asDiv,
  ...props
}: PressableCardProps) {
  const classes = [styles.card, className].filter(Boolean).join(" ");

  if (asDiv) {
    return <div className={classes}>{children}</div>;
  }

  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  );
}
