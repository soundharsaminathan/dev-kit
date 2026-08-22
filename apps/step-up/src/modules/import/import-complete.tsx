import { Icon } from "@dev-ui/icons";
import { TouchButton } from "@/modules/ui/touch-button";
import {
  activeImportEntities,
  IMPORT_ENTITY_LABELS,
  type ImportEntitiesSnapshot,
  totalImportCreated,
  totalImportSkipped,
} from "./import-types";
import styles from "./import-pipeline.module.scss";

export function ImportComplete({
  entities,
  onViewStudio,
}: {
  entities: ImportEntitiesSnapshot;
  onViewStudio: () => void;
}) {
  const keys = activeImportEntities(entities);
  const created = totalImportCreated(entities);
  const skipped = totalImportSkipped(entities);

  return (
    <div className={styles.pipeline}>
      <div className={styles.completeHero}>
        <span className={styles.completeIcon} aria-hidden>
          <Icon name="check-circle" />
        </span>
        <h2 className={styles.completeTitle}>Import complete</h2>
        <p className={styles.completeSubtitle}>Your studio is ready.</p>
      </div>

      <div className={styles.statsGrid}>
        {keys.map((key) => {
          const entity = entities[key];
          return (
            <div key={key} className={styles.statCard}>
              <span className={styles.statValue}>{entity.created}</span>
              <span className={styles.statLabel}>
                {IMPORT_ENTITY_LABELS[key]}
              </span>
            </div>
          );
        })}
      </div>

      <p className={styles.summaryLine}>
        {created.toLocaleString("en-IN")} records created successfully
        {skipped > 0
          ? ` · ${skipped.toLocaleString("en-IN")} rows skipped`
          : ""}
      </p>

      <TouchButton variant="primary" fullWidth onClick={onViewStudio}>
        View studio
      </TouchButton>
    </div>
  );
}
