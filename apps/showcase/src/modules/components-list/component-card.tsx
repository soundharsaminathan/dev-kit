import { useNavigate } from "@tanstack/react-router";
import { createElement, type KeyboardEvent } from "react";
import type { ComponentInfo } from "@/lib/components-data";
import { getCardPreviewProps } from "@/lib/preview-props";
import { getRegistryEntry } from "@/registry";
import styles from "./component-card.module.scss";

interface ComponentCardProps extends ComponentInfo {
  scale?: number;
}

export function ComponentCard({ name, slug, scale = 0.9 }: ComponentCardProps) {
  const navigate = useNavigate();
  const entry = getRegistryEntry(slug);
  const preview = entry
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
      role="link"
      tabIndex={0}
      aria-label={name}
      data-component={slug}
      className={styles.card}
      onClick={goToComponent}
      onKeyDown={handleKeyDown}
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
