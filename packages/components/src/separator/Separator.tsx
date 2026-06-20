import { composeRefs } from "@dev-ui/core";
import { useSeparator } from "@react-aria/separator";
import { useRef } from "react";
import styles from "./separator.module.scss";
import type { SeparatorProps } from "./separator.types";

function Separator({
  ref,
  orientation = "horizontal",
  ...props
}: SeparatorProps) {
  const domRef = useRef<HTMLHRElement>(null);
  const { separatorProps } = useSeparator({ orientation });

  return (
    <hr
      {...separatorProps}
      {...props}
      ref={composeRefs(domRef, ref)}
      className={styles.root}
      data-orientation={orientation}
    />
  );
}

export type { SeparatorProps };
export { Separator };
