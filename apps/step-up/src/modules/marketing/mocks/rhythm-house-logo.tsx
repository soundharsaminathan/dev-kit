import styles from "./mocks.module.scss";

/** Miniature studio wordmark, matching a uploaded logo in the app sidebar. */
export function RhythmHouseLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 148 32"
      className={className ?? styles.brandLogo}
      aria-hidden
    >
      <title>Rhythm House</title>
      <rect width="32" height="32" rx="8" fill="var(--color-primary)" />
      <text
        x="16"
        y="21.5"
        textAnchor="middle"
        fill="var(--color-fg-on-primary, #1c1a17)"
        fontSize="13"
        fontWeight="800"
        fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
        letterSpacing="-0.06em"
      >
        RH
      </text>
      <text
        x="40"
        y="21"
        fill="currentColor"
        fontSize="14"
        fontWeight="700"
        fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
        letterSpacing="-0.04em"
      >
        Rhythm House
      </text>
    </svg>
  );
}
