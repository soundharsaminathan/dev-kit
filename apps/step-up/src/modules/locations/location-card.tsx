import { useNavigate } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { PressableCard } from "@/modules/ui/pressable-card";
import styles from "./location-card.module.scss";
import { coverUrl, type StudioBranch } from "./types";

type LocationCardProps = {
  branch: StudioBranch;
  detailTo: "/app/locations/$id" | "/me/locations/$id";
  ratingAvg?: number | null;
  ratingCount?: number;
  footer?: ReactNode;
  layoutId?: string;
};

export function LocationCard({
  branch,
  detailTo,
  ratingAvg,
  ratingCount,
  footer,
  layoutId,
}: LocationCardProps) {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const cover = coverUrl(branch);
  const mediaCount = branch.media?.length ?? (cover ? 1 : 0);

  return (
    <PressableCard asDiv className={styles.card}>
      <button
        type="button"
        className={styles.link}
        aria-label={`Open ${branch.name}`}
        onClick={() => {
          void navigate({ to: detailTo, params: { id: branch.id } });
        }}
      >
        <div className={styles.coverWrap}>
          {cover ? (
            <motion.img
              {...(reducedMotion || !layoutId ? {} : { layoutId })}
              src={cover}
              alt=""
              className={styles.cover}
              loading="lazy"
            />
          ) : (
            <div className={styles.coverFallback} aria-hidden />
          )}
          <div className={styles.coverScrim} />
          <div className={styles.coverMeta}>
            <h2 className={styles.title}>{branch.name}</h2>
            <p className={styles.address}>{branch.address}</p>
          </div>
        </div>
        <div className={styles.body}>
          <p className={styles.meta}>
            {mediaCount > 0 ? `${mediaCount} media` : "No gallery yet"}
            {typeof branch._count?.batches === "number"
              ? ` · ${branch._count.batches} class${branch._count.batches === 1 ? "" : "es"}`
              : null}
            {ratingAvg != null && ratingCount
              ? ` · ${ratingAvg.toFixed(1)}★ (${ratingCount})`
              : null}
          </p>
          {branch.description ? (
            <p className={styles.description}>{branch.description}</p>
          ) : null}
        </div>
      </button>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </PressableCard>
  );
}
