import { profile } from "@/content/profile";
import styles from "./TitleBar.module.scss";

export function TitleBar() {
  return (
    <header className={styles.bar}>
      <div className={styles.left}>
        <div className={styles.traffic} aria-hidden>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </div>
        <span className={styles.brand}>{profile.name} — Portfolio</span>
        <span className={styles.path}>{profile.workspacePath}</span>
      </div>
      <div className={styles.right}>
        <span className={styles.menuHint}>
          ⌘/Ctrl+Shift+P · Command Palette
        </span>
      </div>
    </header>
  );
}
