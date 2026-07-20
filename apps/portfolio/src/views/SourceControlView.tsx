import { experienceCommits } from "@/content/workspace";
import { useIde } from "@/state/IdeContext";
import styles from "./views.module.scss";

export function SourceControlView() {
  const { openFile, activeFileId } = useIde();

  return (
    <div>
      <div
        style={{
          padding: "4px 14px 10px",
          fontSize: 12,
          color: "var(--ide-fg-muted)",
        }}
      >
        Career history as commits
      </div>
      {experienceCommits.map((commit) => (
        <button
          key={commit.id}
          type="button"
          className={`${styles.commit} ${activeFileId === commit.fileId ? styles.commitActive : ""}`}
          onClick={() => openFile(commit.fileId)}
        >
          <div className={styles.commitHash}>{commit.hash}</div>
          <div className={styles.commitTitle}>
            {commit.title}
            {commit.sample ? (
              <span className={styles.sampleTag}>sample</span>
            ) : null}
          </div>
          <div className={styles.commitMeta}>
            {commit.company} · {commit.period}
          </div>
        </button>
      ))}
    </div>
  );
}
