import styles from "./kbd.module.scss";
import type { KbdGroupProps, KbdProps } from "./kbd.types";

function KbdGroup({ children, ...props }: KbdGroupProps) {
  return (
    <kbd data-kbd-group="" className={styles.group} {...props}>
      {children}
    </kbd>
  );
}

function Kbd({ children, ...props }: KbdProps) {
  return (
    <kbd data-kbd="" className={styles.kbd} {...props}>
      {children}
    </kbd>
  );
}

export type { KbdGroupProps, KbdProps };
export { Kbd, KbdGroup };
