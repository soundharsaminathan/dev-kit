import { cn, composeRefs } from "@dev-ui/core";
import { useRef } from "react";
import styles from "./scroll-fade.module.scss";
import type { ScrollFadeProps } from "./scroll-fade.types";
import { useScrollFade } from "./use-scroll-fade";

function ScrollFade({ ref, className, ...props }: ScrollFadeProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  useScrollFade({ ref: innerRef });

  return (
    <div
      {...props}
      ref={composeRefs(innerRef, ref)}
      data-slot="scroll-fade"
      role="presentation"
      className={cn(styles.root, className)}
    />
  );
}

export type { ScrollFadeProps } from "./scroll-fade.types";
export { ScrollFade };
