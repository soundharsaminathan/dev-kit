import { composeRefs } from "@dev-ui/core";
import { Icon } from "@dev-ui/icons";
import { useProgressBar } from "@react-aria/progress";
import { useRef } from "react";
import styles from "./loader.module.scss";
import type { LoaderProps, LoaderVariant } from "./loader.types";

function Loader({
  ref,
  variant: _variant = "spinner",
  "aria-label": ariaLabel = "loading...",
  ...props
}: LoaderProps) {
  const domRef = useRef<HTMLDivElement>(null);
  const { progressBarProps } = useProgressBar({
    ...props,
    isIndeterminate: true,
    "aria-label": ariaLabel,
  } as Parameters<typeof useProgressBar>[0]);

  return (
    <div
      {...progressBarProps}
      ref={composeRefs(domRef, ref)}
      data-loader=""
      className={styles.root}
    >
      <Icon
        name="loader"
        role="status"
        aria-label="Loading"
        aria-hidden={false}
        className={styles.icon}
      />
    </div>
  );
}

export type { LoaderProps, LoaderVariant };
export { Loader };
