import { debugConfigs } from "@/content/workspace";
import { useIde } from "@/state/IdeContext";
import styles from "./views.module.scss";

export function DebugView() {
  const { openFile } = useIde();

  return (
    <div>
      <div
        style={{
          padding: "4px 14px 10px",
          fontSize: 12,
          color: "var(--ide-fg-muted)",
        }}
      >
        RUN AND DEBUG · case studies
      </div>
      {debugConfigs.map((cfg) => (
        <button
          key={cfg.id}
          type="button"
          className={styles.debugItem}
          onClick={() => openFile(cfg.fileId)}
        >
          <div className={styles.debugType}>{cfg.type}</div>
          <div className={styles.debugName}>
            {cfg.name}
            {cfg.sample ? (
              <span className={styles.sampleTag}>sample</span>
            ) : null}
          </div>
        </button>
      ))}
    </div>
  );
}

export function DebugCasePanel({ configId }: { configId: string }) {
  const cfg = debugConfigs.find((c) => c.id === configId);
  if (!cfg) return null;
  return (
    <article className={styles.caseStudy}>
      {cfg.sample ? (
        <div className={styles.badge}>Sample data · TODO: replace</div>
      ) : null}
      <h1 className={styles.h1}>{cfg.name}</h1>
      <div className={styles.caseLabel}>Problem</div>
      <p className={styles.p}>{cfg.problem}</p>
      <div className={styles.caseLabel}>Approach</div>
      <p className={styles.p}>{cfg.approach}</p>
      <div className={styles.caseLabel}>Outcome</div>
      <p className={styles.p}>{cfg.outcome}</p>
    </article>
  );
}
