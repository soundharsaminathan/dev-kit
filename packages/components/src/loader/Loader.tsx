import { composeRefs } from "@dev-ui/core";
import { useProgressBar } from "@react-aria/progress";
import { useRef } from "react";
import styles from "./loader.module.scss";
import type { LoaderProps, LoaderVariant } from "./loader.types";

function SpinnerIcon() {
  return (
    <svg
      role="status"
      aria-label="Loading"
      viewBox="0 0 24 24"
      fill="none"
      className={styles.icon}
    >
      <circle
        className={styles.ringTrack}
        cx="12"
        cy="12"
        r="10"
        strokeWidth="4"
      />
      <path
        className={styles.ringSegment}
        d="M22 12a10 10 0 0 1-10 10v-4a6 6 0 0 0 6-6h4Z"
      />
    </svg>
  );
}

function RingIcon() {
  return (
    <svg
      role="status"
      aria-label="Loading"
      viewBox="0 0 24 24"
      fill="none"
      className={styles.icon}
    >
      <circle
        className={styles.ringTrack}
        cx="12"
        cy="12"
        r="10"
        strokeWidth="4"
      />
      <path
        className={styles.ringSegment}
        d="M22 12a10 10 0 0 1-10 10v-4a6 6 0 0 0 6-6h4Z"
      />
    </svg>
  );
}

function Loader({
  ref,
  variant = "spinner",
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
      {variant === "spinner" ? <SpinnerIcon /> : <RingIcon />}
    </div>
  );
}

export type { LoaderProps, LoaderVariant };
export { Loader };
