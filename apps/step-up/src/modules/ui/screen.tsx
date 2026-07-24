import { Icon } from "@dev-ui/icons";
import { useCanGoBack, useRouter } from "@tanstack/react-router";
import { type ReactNode, type UIEvent, useEffect, useState } from "react";
import styles from "./screen.module.scss";

type ScreenProps = {
  title: string;
  subtitle?: string | undefined;
  actions?: ReactNode;
  children: ReactNode;
  backTo?: string;
  showBack?: boolean;
  onBack?: () => void;
  className?: string;
  wide?: boolean;
  paddedCta?: boolean;
  hideHeaderOnMobile?: boolean;
};

export function Screen({
  title,
  subtitle,
  actions,
  children,
  backTo,
  showBack = false,
  onBack,
  className,
  wide = false,
  paddedCta = false,
  hideHeaderOnMobile = false,
}: ScreenProps) {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const el = document.querySelector("[data-app-scroll]");
    if (!el) return;

    function onScroll() {
      setCompact((el as HTMLElement).scrollTop > 24);
    }

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  function handleBack() {
    if (onBack) {
      onBack();
      return;
    }
    if (canGoBack) {
      router.history.back();
      return;
    }
    if (backTo) {
      void router.navigate({ to: backTo });
    }
  }

  const screenClass = [
    "screen",
    wide ? "screen-wide" : "",
    paddedCta ? "screen-padded-cta" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={screenClass}>
      <header
        className={styles.header}
        data-compact={compact ? "true" : undefined}
        data-hide-mobile={hideHeaderOnMobile ? "true" : undefined}
      >
        <div className={styles.topRow}>
          {showBack ? (
            <button
              type="button"
              className={styles.back}
              aria-label="Go back"
              onClick={handleBack}
            >
              <Icon name="chevron-left" />
            </button>
          ) : null}
          <div className={styles.titleBlock}>
            <h1 className={styles.title}>{title}</h1>
          </div>
          {actions ? <div className={styles.actions}>{actions}</div> : null}
        </div>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  );
}

export function ScreenScroll({
  children,
  onScroll,
}: {
  children: ReactNode;
  onScroll?: (event: UIEvent<HTMLDivElement>) => void;
}) {
  return (
    <div className="screen-scroll" onScroll={onScroll}>
      {children}
    </div>
  );
}
