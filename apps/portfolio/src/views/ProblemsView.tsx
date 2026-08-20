import { problems } from "@/content/workspace";
import styles from "./views.module.scss";

export function ProblemsView() {
  return (
    <div>
      {problems.map((p) => (
        <div key={p.id} className={styles.problemRow}>
          <span
            className={`${styles.sev} ${
              p.severity === "info"
                ? styles.sevInfo
                : p.severity === "warning"
                  ? styles.sevWarning
                  : styles.sevHint
            }`}
          >
            {p.severity}
          </span>
          <span>{p.message}</span>
          <span style={{ marginLeft: "auto", color: "var(--ide-fg-muted)" }}>
            {p.source}
          </span>
        </div>
      ))}
    </div>
  );
}
