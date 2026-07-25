import {
  type ReactNode,
  type TouchEvent,
  useCallback,
  useRef,
  useState,
} from "react";
import styles from "./pull-to-refresh.module.scss";

type PullToRefreshProps = {
  onRefresh: () => Promise<unknown> | undefined;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
};

export function PullToRefresh({
  onRefresh,
  children,
  disabled,
  className,
}: PullToRefreshProps) {
  const startY = useRef(0);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const reset = useCallback(() => setPull(0), []);

  async function runRefresh() {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
      reset();
    }
  }

  function onTouchStart(event: TouchEvent) {
    if (disabled || refreshing) return;
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) return;
    startY.current = event.touches[0]?.clientY ?? 0;
  }

  function onTouchMove(event: TouchEvent) {
    if (disabled || refreshing || startY.current === 0) return;
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) return;
    const dy = (event.touches[0]?.clientY ?? 0) - startY.current;
    if (dy > 0) {
      setPull(Math.min(dy * 0.45, 72));
    }
  }

  function onTouchEnd() {
    if (disabled || refreshing) return;
    if (pull > 56) {
      void runRefresh();
    } else {
      reset();
    }
    startY.current = 0;
  }

  const rootClass = [styles.root, className].filter(Boolean).join(" ");

  return (
    <div
      ref={containerRef}
      className={rootClass}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        className={styles.indicator}
        data-active={pull > 8 || refreshing ? "true" : undefined}
        style={{ height: refreshing ? 48 : pull }}
        aria-hidden
      >
        <span
          className={styles.spinner}
          data-spin={refreshing ? "true" : undefined}
        />
      </div>
      {children}
    </div>
  );
}
