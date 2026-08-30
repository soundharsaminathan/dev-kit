import type { CSSProperties, ReactNode } from "react";
import styles from "./product-shot.module.scss";

export type ProductShotProps = {
  /** When set, renders a real screenshot instead of the mock children. */
  src?: string | undefined;
  alt: string;
  /** Desktop CSS aspect-ratio, e.g. "16 / 10". Mobile uses a phone ratio. */
  ratio: string;
  browserChrome?: boolean | undefined;
  /** `desktop` keeps the browser frame and ratio at every breakpoint. */
  layout?: "responsive" | "desktop" | undefined;
  className?: string | undefined;
  children?: ReactNode;
};

function BrowserChrome() {
  return (
    <div className={styles.chrome} aria-hidden>
      <span className={styles.dot} data-tone="red" />
      <span className={styles.dot} data-tone="amber" />
      <span className={styles.dot} data-tone="green" />
    </div>
  );
}

function PhoneChrome() {
  return (
    <div className={styles.phoneBar} aria-hidden>
      <span className={styles.phoneTime}>9:41</span>
      <span className={styles.phonePills}>
        <span />
        <span />
        <span />
      </span>
    </div>
  );
}

/**
 * Product visual frame. Pass `src` to swap a React mock for a real PNG later.
 * Mobile shows a phone frame and portrait ratio; desktop uses `ratio` and browser chrome.
 */
export function ProductShot({
  src,
  alt,
  ratio,
  browserChrome = true,
  layout = "responsive",
  className,
  children,
}: ProductShotProps) {
  const frameClass = [styles.frame, className ?? ""].filter(Boolean).join(" ");

  return (
    <figure
      className={frameClass}
      data-browser={browserChrome ? "true" : undefined}
      data-layout={layout === "desktop" ? "desktop" : undefined}
      style={{ "--shot-ratio": ratio } as CSSProperties}
    >
      {src ? (
        <img
          className={styles.image}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          width={1280}
          height={Math.round(1280 / (16 / 10))}
        />
      ) : (
        <>
          <PhoneChrome />
          {browserChrome ? <BrowserChrome /> : null}
          <div className={styles.mock} role="img" aria-label={alt}>
            {children}
          </div>
          <div className={styles.homeIndicator} aria-hidden />
        </>
      )}
    </figure>
  );
}
