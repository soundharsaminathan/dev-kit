import { Puzzle } from "lucide-react";
import { extensions } from "@/content/workspace";
import styles from "./views.module.scss";

export function ExtensionsView() {
  return (
    <div>
      <div
        style={{
          padding: "4px 14px 10px",
          fontSize: 12,
          color: "var(--ide-fg-muted)",
        }}
      >
        Installed · tools & strengths
      </div>
      {extensions.map((ext) => (
        <div key={ext.id} className={styles.extCard}>
          <div className={styles.extIcon}>
            <Puzzle size={18} />
          </div>
          <div>
            <div className={styles.extName}>
              {ext.name}
              {ext.sample ? (
                <span className={styles.sampleTag}>sample</span>
              ) : null}
            </div>
            <div className={styles.extPub}>
              {ext.publisher} · {ext.category}
            </div>
            <div className={styles.extDesc}>{ext.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
