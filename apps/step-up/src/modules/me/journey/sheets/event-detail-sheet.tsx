import { Icon, type IconName } from "@dev-ui/icons";
import { AppSheet } from "@/modules/ui/app-sheet";
import { TouchButton } from "@/modules/ui/touch-button";
import { isClusterEvent, type JourneyPathItem } from "../journey-types";
import styles from "./sheets.module.scss";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
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
  "share",
]);

function asIconName(name: string): IconName {
  return (KNOWN_ICONS.has(name) ? name : "star") as IconName;
}

type EventDetailSheetProps = {
  item: JourneyPathItem | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EventDetailSheet({
  item,
  isOpen,
  onOpenChange,
}: EventDetailSheetProps) {
  if (!item) return null;

  const title = item.title;
  const description = isClusterEvent(item)
    ? `${item.count} classes from ${formatDate(item.startAt)} to ${formatDate(item.endAt)}`
    : typeof item.meta?.description === "string"
      ? item.meta.description
      : null;

  return (
    <AppSheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={title}
      size="tall"
    >
      <div className={styles.detail}>
        <div className={styles.detailHero}>
          <span className={styles.detailIcon}>
            <Icon name={asIconName(item.icon)} />
          </span>
          <div>
            <p className={styles.detailKind}>
              {isClusterEvent(item)
                ? "Classes"
                : item.kind.replaceAll("_", " ")}
            </p>
            <p className={styles.detailDate}>{formatDate(item.occurredAt)}</p>
          </div>
          {item.xp ? (
            <span className={styles.detailXp}>+{item.xp} XP</span>
          ) : null}
        </div>

        {!isClusterEvent(item) &&
        (item.imageUrl || item.certificatePreviewUrl) ? (
          <img
            className={styles.detailImage}
            src={item.imageUrl || item.certificatePreviewUrl || undefined}
            alt=""
          />
        ) : null}

        {description ? (
          <p className={styles.detailBody}>{description}</p>
        ) : null}

        {!isClusterEvent(item) && item.trainer ? (
          <div className={styles.trainerRow}>
            {item.trainer.photoUrl ? (
              <img
                className={styles.trainerAvatar}
                src={item.trainer.photoUrl}
                alt=""
              />
            ) : (
              <span className={styles.trainerFallback}>
                <Icon name="user" />
              </span>
            )}
            <div>
              <p className={styles.trainerLabel}>Trainer</p>
              <p className={styles.trainerName}>{item.trainer.name}</p>
            </div>
          </div>
        ) : null}

        {isClusterEvent(item) ? (
          <p className={styles.detailBody}>
            Zoom in or tap expand on the map to see each class.
          </p>
        ) : null}
      </div>
    </AppSheet>
  );
}

type QuickActionsSheetProps = {
  item: JourneyPathItem | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onViewBatch?: ((batchId: string) => void) | undefined;
  onShare?: (() => void) | undefined;
};

export function QuickActionsSheet({
  item,
  isOpen,
  onOpenChange,
  onViewBatch,
  onShare,
}: QuickActionsSheetProps) {
  if (!item || isClusterEvent(item)) {
    return (
      <AppSheet isOpen={isOpen} onOpenChange={onOpenChange} title="Actions">
        <p className={styles.detailBody}>No quick actions for this item.</p>
      </AppSheet>
    );
  }

  const batchId =
    typeof item.meta?.batchId === "string" ? item.meta.batchId : null;

  return (
    <AppSheet isOpen={isOpen} onOpenChange={onOpenChange} title="Quick actions">
      <div className={styles.actions}>
        {onShare ? (
          <TouchButton
            className={styles.actionButton}
            onClick={() => {
              onShare();
              onOpenChange(false);
            }}
          >
            <Icon name="share" />
            Share milestone
          </TouchButton>
        ) : null}
        {batchId && onViewBatch ? (
          <TouchButton
            className={styles.actionButton}
            onClick={() => {
              onViewBatch(batchId);
              onOpenChange(false);
            }}
          >
            <Icon name="users" />
            View batch
          </TouchButton>
        ) : null}
        {!batchId && !onShare ? (
          <p className={styles.detailBody}>No quick actions available.</p>
        ) : null}
      </div>
    </AppSheet>
  );
}
