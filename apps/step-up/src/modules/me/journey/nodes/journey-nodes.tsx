import { Icon, type IconName } from "@dev-ui/icons";
import type { NodeProps } from "@xyflow/react";
import { type MouseEvent, memo, type PointerEvent, useRef } from "react";
import { isClusterEvent } from "../journey-types";
import type { JourneyNodeData } from "../layout-path";
import styles from "./nodes.module.scss";

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

const KNOWN_ICONS = new Set<string>([
  "sparkles",
  "users",
  "clipboard",
  "check-circle",
  "zap",
  "star",
  "badge-check",
  "user",
  "trending-up",
  "message-square",
  "layout-grid",
  "map",
]);

function asIconName(name: string): IconName {
  return (KNOWN_ICONS.has(name) ? name : "star") as IconName;
}

export type JourneyNodeActions = {
  onOpen: (id: string) => void;
  onLongPress: (id: string) => void;
  onExpandCluster?: (id: string) => void;
};

function usePressHandlers(
  id: string,
  onOpen: (id: string) => void,
  onLongPress: (id: string) => void,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressedRef = useRef(false);

  function clear() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  return {
    onPointerDown: (event: PointerEvent) => {
      if (event.button !== 0) return;
      longPressedRef.current = false;
      timerRef.current = setTimeout(() => {
        longPressedRef.current = true;
        onLongPress(id);
      }, 400);
    },
    onPointerUp: () => {
      const wasLong = longPressedRef.current;
      clear();
      if (!wasLong) onOpen(id);
    },
    onPointerLeave: clear,
    onPointerCancel: clear,
    onContextMenu: (event: MouseEvent) => {
      event.preventDefault();
    },
  };
}

function MilestoneNodeView({
  data,
  actions,
}: {
  data: JourneyNodeData;
  actions: JourneyNodeActions;
}) {
  const item = data.item;
  const handlers = usePressHandlers(
    item.id,
    actions.onOpen,
    actions.onLongPress,
  );

  if (isClusterEvent(item)) return null;

  return (
    <button
      type="button"
      className={styles.milestone}
      data-status={item.status}
      data-newly={item.newlyEarned ? "true" : undefined}
      aria-label={item.title}
      {...handlers}
    >
      {item.imageUrl || item.certificatePreviewUrl ? (
        <img
          className={styles.milestoneMedia}
          src={item.imageUrl || item.certificatePreviewUrl || undefined}
          alt=""
        />
      ) : null}
      {item.xp ? <span className={styles.xpChip}>+{item.xp} XP</span> : null}
      <span className={styles.milestoneIcon}>
        <Icon name={asIconName(item.icon)} />
      </span>
      <span className={styles.milestoneTitle}>{item.title}</span>
      <span className={styles.milestoneDate}>
        {formatShortDate(item.occurredAt)}
      </span>
      {item.trainer?.photoUrl ? (
        <img
          className={styles.trainer}
          src={item.trainer.photoUrl}
          alt={item.trainer.name}
        />
      ) : null}
    </button>
  );
}

function EventNodeView({
  data,
  actions,
}: {
  data: JourneyNodeData;
  actions: JourneyNodeActions;
}) {
  const item = data.item;
  const handlers = usePressHandlers(
    item.id,
    actions.onOpen,
    actions.onLongPress,
  );

  if (isClusterEvent(item)) return null;

  return (
    <button
      type="button"
      className={styles.event}
      data-status={item.status}
      data-tier={item.tier}
      aria-label={item.title}
      {...handlers}
    >
      <span className={styles.eventIcon} data-tier={item.tier}>
        <Icon name={asIconName(item.icon)} />
      </span>
      <span className={styles.eventTitle}>{item.title}</span>
      {item.trainer?.photoUrl && item.tier !== "small" ? (
        <img
          className={styles.trainer}
          src={item.trainer.photoUrl}
          alt={item.trainer.name}
        />
      ) : null}
    </button>
  );
}

function ClusterNodeView({
  data,
  actions,
}: {
  data: JourneyNodeData;
  actions: JourneyNodeActions;
}) {
  const item = data.item;
  if (!isClusterEvent(item)) return null;

  return (
    <button
      type="button"
      className={styles.cluster}
      data-status={item.status}
      aria-label={item.title}
      onClick={() => actions.onExpandCluster?.(item.id)}
    >
      <span className={styles.clusterRing}>{item.count}</span>
      <span className={styles.clusterLabel}>{item.title}</span>
    </button>
  );
}

export function createJourneyNodeTypes(actions: JourneyNodeActions) {
  return {
    milestone: memo(function MilestoneNode(props: NodeProps) {
      return (
        <MilestoneNodeView
          data={props.data as JourneyNodeData}
          actions={actions}
        />
      );
    }),
    event: memo(function EventNode(props: NodeProps) {
      return (
        <EventNodeView data={props.data as JourneyNodeData} actions={actions} />
      );
    }),
    cluster: memo(function ClusterNode(props: NodeProps) {
      return (
        <ClusterNodeView
          data={props.data as JourneyNodeData}
          actions={actions}
        />
      );
    }),
  };
}
