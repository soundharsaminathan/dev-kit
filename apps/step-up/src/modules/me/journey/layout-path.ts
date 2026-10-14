import { type Edge, type Node, Position } from "@xyflow/react";
import type {
  JourneyClusterEvent,
  JourneyEvent,
  JourneyEventStatus,
  JourneyEventTier,
  JourneyPathItem,
} from "./journey-types";
import { isClusterEvent } from "./journey-types";

export const NODE_SIZE: Record<JourneyEventTier | "cluster", number> = {
  large: 112,
  medium: 72,
  small: 44,
  cluster: 72,
};

export const PATH_CENTER_X = 180;
export const PATH_AMPLITUDE_BASE = 56;
export const PATH_AMPLITUDE_GROWTH = 8;
export const PATH_VERTICAL_GAP = 96;
export const CLUSTER_ZOOM_THRESHOLD = 0.75;
export const CLUSTER_MIN_COUNT = 5;
export const CLUSTER_MAX_SPAN_DAYS = 14;

export type JourneyNodeData = {
  item: JourneyPathItem;
  size: number;
};

export type JourneyEdgeData = {
  status: JourneyEventStatus;
};

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const ms =
    new Date(`${dayKey(b)}T00:00:00.000Z`).getTime() -
    new Date(`${dayKey(a)}T00:00:00.000Z`).getTime();
  return Math.round(ms / 86_400_000);
}

function monthLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

export function clusterAttendanceEvents(
  events: JourneyEvent[],
  options: {
    zoom: number;
    forceExpandIds?: Set<string>;
  },
): JourneyPathItem[] {
  const shouldCluster = options.zoom < CLUSTER_ZOOM_THRESHOLD;
  if (!shouldCluster) {
    return events;
  }

  const result: JourneyPathItem[] = [];
  let i = 0;

  while (i < events.length) {
    const current = events[i]!;
    if (current.kind !== "ATTENDANCE") {
      result.push(current);
      i += 1;
      continue;
    }

    const group: JourneyEvent[] = [current];
    let j = i + 1;
    while (j < events.length) {
      const next = events[j]!;
      if (next.kind !== "ATTENDANCE") break;
      const span = daysBetween(group[0]!.occurredAt, next.occurredAt);
      if (span > CLUSTER_MAX_SPAN_DAYS) break;
      group.push(next);
      j += 1;
    }

    if (group.length >= CLUSTER_MIN_COUNT) {
      const startAt = group[0]!.occurredAt;
      const endAt = group[group.length - 1]!.occurredAt;
      const clusterId = `cluster-${group[0]!.id}-${group[group.length - 1]!.id}`;
      if (options.forceExpandIds?.has(clusterId)) {
        result.push(...group);
      } else {
        const status: JourneyEventStatus = group.some(
          (item) => item.status === "current",
        )
          ? "current"
          : group.every((item) => item.status === "upcoming")
            ? "upcoming"
            : "completed";
        const cluster: JourneyClusterEvent = {
          id: clusterId,
          kind: "CLUSTER",
          tier: "medium",
          title: `${group.length} classes · ${monthLabel(startAt)}`,
          occurredAt: endAt,
          status,
          icon: "layout-grid",
          filterTags: ["attendance"],
          count: group.length,
          startAt,
          endAt,
          childIds: group.map((item) => item.id),
          xp: group.reduce((sum, item) => sum + (item.xp ?? 0), 0),
        };
        result.push(cluster);
      }
      i = j;
      continue;
    }

    result.push(...group);
    i = j;
  }

  return result;
}

export function layoutPathItems(items: JourneyPathItem[]): {
  nodes: Node<JourneyNodeData>[];
  edges: Edge<JourneyEdgeData>[];
} {
  const nodes: Node<JourneyNodeData>[] = [];
  const edges: Edge<JourneyEdgeData>[] = [];

  items.forEach((item, index) => {
    const progress = items.length <= 1 ? 0 : index / (items.length - 1);
    const amplitude =
      PATH_AMPLITUDE_BASE + progress * PATH_AMPLITUDE_GROWTH * items.length;
    const side = index % 2 === 0 ? -1 : 1;
    const size = isClusterEvent(item)
      ? NODE_SIZE.cluster
      : NODE_SIZE[item.tier];
    const x = PATH_CENTER_X + side * amplitude * Math.sin(progress * Math.PI);
    const y = index * PATH_VERTICAL_GAP;

    nodes.push({
      id: item.id,
      type: isClusterEvent(item)
        ? "cluster"
        : item.tier === "large"
          ? "milestone"
          : "event",
      position: { x: x - size / 2, y },
      data: { item, size },
      width: size,
      height: size,
      draggable: false,
      selectable: false,
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      style: { width: size, height: size },
    });

    if (index > 0) {
      const prev = items[index - 1]!;
      const edgeStatus: JourneyEventStatus =
        item.status === "upcoming" || prev.status === "upcoming"
          ? "upcoming"
          : item.status === "current"
            ? "current"
            : "completed";
      edges.push({
        id: `e-${prev.id}-${item.id}`,
        source: prev.id,
        target: item.id,
        type: "journey",
        data: { status: edgeStatus },
        animated: edgeStatus !== "upcoming",
      });
    }
  });

  return { nodes, edges };
}

export function buildJourneyGraph(
  events: JourneyEvent[],
  options: {
    zoom: number;
    forceExpandIds?: Set<string>;
  },
) {
  const items = clusterAttendanceEvents(events, options);
  return { ...layoutPathItems(items), items };
}
