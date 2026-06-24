import { cn } from "@dev-ui/core";
import styles from "./keyboard.module.scss";
import type { KeyboardGroupProps, KeyboardProps } from "./keyboard.types";

function Keyboard({ className, children, ...props }: KeyboardProps) {
  return (
    <kbd
      {...props}
      dir="ltr"
      data-keyboard=""
      className={cn(styles.key, className)}
    >
      {children}
    </kbd>
  );
}

function KeyboardGroup({ className, children, ...props }: KeyboardGroupProps) {
  return (
    <kbd
      {...props}
      dir="ltr"
      data-keyboard-group=""
      className={cn(styles.group, className)}
    >
      {children}
    </kbd>
  );
}

export type { KeyboardGroupProps, KeyboardProps } from "./keyboard.types";
export { Keyboard, KeyboardGroup };
