import type { WorkspaceFile } from "@/content/workspace";
import { useIde } from "@/state/IdeContext";
import { JsonView } from "./JsonView";
import { MarkdownView } from "./MarkdownView";
import styles from "./views.module.scss";

export function FileView({ file }: { file: WorkspaceFile }) {
  const { openTerminal } = useIde();

  if (file.kind === "json") {
    return <JsonView body={file.body} sample={Boolean(file.sample)} />;
  }

  if (file.kind === "shell") {
    return (
      <article className={styles.view}>
        <h1 className={styles.h1}>Contact</h1>
        <p className={styles.p}>
          Run contact commands in the integrated terminal.
        </p>
        <div className={styles.heroActions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={openTerminal}
          >
            Open Terminal
          </button>
        </div>
        <pre className={styles.json}>{file.body}</pre>
      </article>
    );
  }

  if (file.kind === "education" && file.meta) {
    return (
      <article className={styles.view}>
        <div className={styles.metaRow}>
          <span>
            Years: <span className={styles.metaStrong}>{file.meta.years}</span>
          </span>
          <span>
            Institution:{" "}
            <span className={styles.metaStrong}>{file.meta.institution}</span>
          </span>
          <span>
            Degree:{" "}
            <span className={styles.metaStrong}>{file.meta.degree}</span>
          </span>
        </div>
        <MarkdownView body={file.body} sample={Boolean(file.sample)} />
      </article>
    );
  }

  return (
    <MarkdownView
      body={file.body}
      sample={Boolean(file.sample)}
      hero={file.id === "README.md"}
    />
  );
}
