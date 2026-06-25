import { useNavigate } from "@tanstack/react-router";
import {
  createElement,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ComponentInfo } from "@/lib/components-data";
import { getCardPreviewProps } from "@/lib/preview-props";
import { getRegistryEntry } from "@/registry";
import styles from "./component-card.module.scss";

interface ComponentCardProps extends ComponentInfo {
  /** Defer mounting the live playground until the card is hovered, focused, or in view. */
  deferPreview?: boolean;
  scale?: number;
}

export function ComponentCard({
  name,
  slug,
  deferPreview = false,
  scale = 0.9,
}: ComponentCardProps) {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(!deferPreview);
  const entry = getRegistryEntry(slug);
  const activatePreview = useCallback(() => {
    setShowPreview(true);
  }, []);

  useEffect(() => {
    if (!deferPreview || showPreview) {
      return;
    }

    const element = cardRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShowPreview(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [deferPreview, showPreview]);

  const preview =
    showPreview && entry
      ? createElement(entry.Playground, getCardPreviewProps(entry.config))
      : null;

  const goToComponent = () => {
    navigate({ to: "/components/$slug", params: { slug } });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      goToComponent();
    }
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: previews may render <a>; a wrapper <a> would nest anchors illegally
    <div
      ref={cardRef}
      role="link"
      tabIndex={0}
      aria-label={name}
      data-component={slug}
      className={styles.card}
      onClick={goToComponent}
      onKeyDown={handleKeyDown}
      onMouseEnter={deferPreview ? activatePreview : undefined}
      onFocus={deferPreview ? activatePreview : undefined}
    >
      <div className={styles.preview}>
        <div
          inert
          className={styles.previewInner}
          style={{ transform: `scale(${scale})` }}
        >
          {preview ?? <span className={styles.placeholder}>{name}</span>}
        </div>
      </div>
      <span className={styles.name}>{name}</span>
    </div>
  );
}
