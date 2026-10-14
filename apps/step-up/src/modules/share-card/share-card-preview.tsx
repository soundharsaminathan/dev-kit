import { useEffect, useRef, useState } from "react";
import styles from "./batch-share-sheet.module.scss";
import { renderShareCard } from "./render-share-card";
import type { BatchShareCardData, ShareCardLayoutId } from "./types";

export type ShareCardPreviewProps = {
  data: BatchShareCardData;
  layout: ShareCardLayoutId;
  className?: string;
};

export function ShareCardPreview({
  data,
  layout,
  className,
}: ShareCardPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    setReady(false);
    setError(null);

    void (async () => {
      try {
        await renderShareCard({ data, layout, canvas });
        if (!cancelled) {
          setReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not render the share card.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [data, layout]);

  return (
    <div
      className={[styles.previewFrame, className].filter(Boolean).join(" ")}
      data-testid="batch-share-preview"
      data-ready={ready ? "true" : undefined}
    >
      <canvas
        ref={canvasRef}
        className={styles.previewCanvas}
        aria-label="Instagram Story share card preview"
      />
      {!ready && !error ? (
        <div className={styles.previewStatus} aria-live="polite">
          Preparing preview…
        </div>
      ) : null}
      {error ? (
        <div className={styles.previewStatus} role="alert">
          {error}
        </div>
      ) : null}
    </div>
  );
}
