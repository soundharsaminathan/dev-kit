import { Icon } from "@dev-ui/icons";
import { useState } from "react";
import {
  IMPORT_ENTITY_DESCRIPTIONS,
  IMPORT_ENTITY_ICONS,
  IMPORT_ENTITY_LABELS,
  type ImportEntityKey,
  type ImportEntityState,
  type ImportEntityStatus,
  resolveEntityStatus,
} from "./import-types";
import styles from "./import-workspace.module.scss";

export type EntityRowMode = "preview" | "live";

type ImportEntityRowProps = {
  entityKey: ImportEntityKey;
  mode: EntityRowMode;
  recordCount?: number;
  invalidRowCount?: number;
  invalidRowSummary?: string | null;
  entity?: ImportEntityState;
  jobDone?: boolean;
  errorMessage?: string | null;
};

function statusLabel(status: ImportEntityStatus): string {
  switch (status) {
    case "completed":
      return "DONE";
    case "creating":
      return "IMPORTING";
    case "failed":
      return "FAILED";
    default:
      return "WAITING";
  }
}

function formatCount(value: number): string {
  return value.toLocaleString("en-IN");
}

export function ImportEntityRow({
  entityKey,
  mode,
  recordCount = 0,
  invalidRowCount = 0,
  invalidRowSummary = null,
  entity,
  jobDone = false,
  errorMessage = null,
}: ImportEntityRowProps) {
  const [expanded, setExpanded] = useState(false);

  const status: ImportEntityStatus =
    mode === "live" && entity
      ? resolveEntityStatus(entity, jobDone)
      : "waiting";

  const isActive = status === "creating";
  const isDone = status === "completed";
  const isFailed = status === "failed";
  const hasDetails =
    Boolean(errorMessage) ||
    Boolean(invalidRowSummary) ||
    (mode === "live" && entity && entity.samples.length > 0);

  const rowPercent =
    mode === "live" && entity && entity.total > 0
      ? Math.min(100, Math.round((entity.processed / entity.total) * 100))
      : 0;

  const countText = (() => {
    if (mode === "live" && entity) {
      if (isActive) {
        return `${formatCount(entity.processed)} of ${formatCount(entity.total)} records`;
      }
      if (isDone) {
        if (entity.created === 0 && entity.total === 0) {
          return "No records";
        }
        if (entity.skipped > 0) {
          return `${formatCount(entity.created)} created · ${formatCount(entity.skipped)} skipped`;
        }
        return `${formatCount(entity.created)} created`;
      }
      if (isFailed) {
        return `${formatCount(entity.processed)} failed`;
      }
      if (entity.total > 0) {
        return `${formatCount(entity.total)} records`;
      }
      return "No records";
    }

    if (recordCount > 0) {
      if (invalidRowCount > 0) {
        return `${formatCount(recordCount)} records · ${formatCount(invalidRowCount)} skipped`;
      }
      return `${formatCount(recordCount)} records`;
    }
    return "No records";
  })();

  return (
    <div
      className={styles.entityRow}
      data-status={status}
      data-active={isActive ? "true" : undefined}
    >
      <div className={styles.entityMain}>
        <span className={styles.entityIcon} aria-hidden>
          <Icon name={IMPORT_ENTITY_ICONS[entityKey]} />
        </span>

        <div className={styles.entityCopy}>
          <div className={styles.entityTitleRow}>
            <span className={styles.entityTitle}>
              {IMPORT_ENTITY_LABELS[entityKey]}
            </span>
            <span className={styles.entityStatus} data-status={status}>
              {isActive ? (
                <Icon name="loader" className={styles.statusSpinner} aria-hidden />
              ) : (
                <span className={styles.statusDot} aria-hidden />
              )}
              {statusLabel(status)}
              {isActive ? "…" : ""}
            </span>
          </div>
          <p className={styles.entityDescription}>
            {IMPORT_ENTITY_DESCRIPTIONS[entityKey]}
          </p>
          {isActive ? (
            <div className={styles.entityInlineProgress}>
              <div className={styles.entityInlineTrack}>
                <div
                  className={styles.entityInlineFill}
                  style={{ width: `${rowPercent}%` }}
                />
              </div>
              <span className={styles.entityInlinePercent}>{rowPercent}%</span>
            </div>
          ) : null}
        </div>

        <div className={styles.entityAside}>
          <span className={styles.entityCount}>{countText}</span>
          {hasDetails ? (
            <button
              type="button"
              className={styles.entityChevron}
              aria-expanded={expanded}
              aria-label={`${expanded ? "Hide" : "Show"} ${IMPORT_ENTITY_LABELS[entityKey]} details`}
              onClick={() => setExpanded((value) => !value)}
            >
              <Icon name={expanded ? "chevron-up" : "chevron-down"} />
            </button>
          ) : null}
        </div>
      </div>

      {expanded && hasDetails ? (
        <div className={styles.entityDetails}>
          {errorMessage ? <p>{errorMessage}</p> : null}
          {invalidRowSummary ? <p>{invalidRowSummary}</p> : null}
          {mode === "live" && entity && entity.samples.length > 0 ? (
            <p>{entity.samples.join(" · ")}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
