import { BaseEdge, type EdgeProps, getBezierPath } from "@xyflow/react";
import type { JourneyEdgeData } from "../layout-path";
import styles from "./journey-edge.module.scss";

export function JourneyEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const status = (data as JourneyEdgeData | undefined)?.status ?? "completed";
  const [path] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: 0.35,
  });

  const gradientId = `journey-edge-gradient-${id}`;
  const statusClass =
    status === "upcoming"
      ? styles.upcoming
      : status === "current"
        ? styles.current
        : styles.completed;

  return (
    <>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="var(--soft-accent, var(--accent))" />
          <stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      <BaseEdge
        id={id}
        path={path}
        className={`${styles.edge} ${statusClass}`}
        style={
          status === "upcoming"
            ? undefined
            : status === "current"
              ? undefined
              : { stroke: `url(#${gradientId})` }
        }
      />
    </>
  );
}

export const journeyEdgeTypes = {
  journey: JourneyEdge,
};
