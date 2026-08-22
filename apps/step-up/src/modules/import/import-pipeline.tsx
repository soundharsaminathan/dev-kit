import { Icon, type IconName } from "@dev-ui/icons";
import {
  ProgressBar,
  ProgressBarFill,
  ProgressBarTrack,
} from "@dev-ui/components/progress-bar";
import {
  activeImportEntities,
  IMPORT_ENTITY_ICONS,
  IMPORT_ENTITY_LABELS,
  type ImportEntityKey,
  type ImportEntityState,
  type ImportEntitiesSnapshot,
} from "./import-types";
import styles from "./import-pipeline.module.scss";

function entityProgressPercent(entity: ImportEntityState): number {
  if (entity.total <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((entity.processed / entity.total) * 100));
}

function statusIcon(entity: ImportEntityState): IconName {
  if (entity.status === "completed") {
    return "check-circle";
  }
  if (entity.status === "failed") {
    return "alert-circle";
  }
  if (entity.status === "creating") {
    return "loader";
  }
  return "circle";
}

function CompactEntityRow({
  entityKey,
  entity,
}: {
  entityKey: ImportEntityKey;
  entity: ImportEntityState;
}) {
  const more =
    entity.created > entity.samples.length
      ? entity.created - entity.samples.length
      : 0;

  return (
    <div className={styles.compactRow}>
      <span className={styles.compactIcon} aria-hidden>
        <Icon name="check-circle" />
      </span>
      <div className={styles.compactBody}>
        <div className={styles.compactTitle}>
          {IMPORT_ENTITY_LABELS[entityKey]}
        </div>
        <p className={styles.compactMeta}>
          {entity.created} created
          {entity.skipped > 0 ? ` · ${entity.skipped} skipped` : ""}
        </p>
        {entity.samples.length > 0 ? (
          <p className={styles.compactSamples}>
            {entity.samples.join(" · ")}
            {more > 0 ? ` · +${more} more` : ""}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function WaitingEntityRow({ entityKey }: { entityKey: ImportEntityKey }) {
  return (
    <div className={styles.waitingRow}>
      <span className={styles.waitingIcon} aria-hidden>
        <Icon name={IMPORT_ENTITY_ICONS[entityKey]} />
      </span>
      <span className={styles.waitingLabel}>
        {IMPORT_ENTITY_LABELS[entityKey]}
      </span>
    </div>
  );
}

function HeroEntityCard({
  entityKey,
  entity,
}: {
  entityKey: ImportEntityKey;
  entity: ImportEntityState;
}) {
  const percent = entityProgressPercent(entity);

  return (
    <div className={styles.heroCard}>
      <span className={`${styles.heroIcon} ${styles.heroIconPulse}`} aria-hidden>
        <Icon name={IMPORT_ENTITY_ICONS[entityKey]} />
      </span>
      <h3 className={styles.heroTitle}>{IMPORT_ENTITY_LABELS[entityKey]}</h3>
      <p className={styles.heroCount}>
        {entity.processed} / {entity.total}
      </p>
      <p className={styles.heroSubtitle}>Creating…</p>
      <div className={styles.progressWrap}>
        <ProgressBar value={percent}>
          <ProgressBarTrack>
            <ProgressBarFill />
          </ProgressBarTrack>
        </ProgressBar>
      </div>
      {entity.samples.length > 0 ? (
        <p className={styles.compactSamples}>
          {entity.samples.join(" · ")}
        </p>
      ) : null}
    </div>
  );
}

export function ImportPipeline({
  entities,
}: {
  entities: ImportEntitiesSnapshot;
}) {
  const keys = activeImportEntities(entities);

  return (
    <div className={styles.pipeline}>
      <p className={styles.pipelineIntro}>Creating your studio data…</p>
      <div className={styles.pipelineList}>
        {keys.map((key, index) => {
          const entity = entities[key];

          return (
            <div key={key} className={styles.pipelineRow}>
              {entity.status === "completed" ? (
                <CompactEntityRow entityKey={key} entity={entity} />
              ) : entity.status === "creating" || entity.status === "failed" ? (
                <HeroEntityCard entityKey={key} entity={entity} />
              ) : (
                <WaitingEntityRow entityKey={key} />
              )}
              {index < keys.length - 1 ? (
                <div className={styles.pipelineConnector} aria-hidden>
                  <Icon name="chevron-down" />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ImportPipelineStatusIcon({
  entity,
}: {
  entity: ImportEntityState;
}) {
  return <Icon name={statusIcon(entity)} />;
}
