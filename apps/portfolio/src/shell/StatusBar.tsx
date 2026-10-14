import {
  Bell,
  Check,
  GitBranch,
  Mail,
  Moon,
  Sun,
  Terminal,
} from "lucide-react";
import { profile } from "@/content/profile";
import { problems } from "@/content/workspace";
import { useTheme } from "@/lib/theme";
import { useIde } from "@/state/IdeContext";
import styles from "./StatusBar.module.scss";

export function StatusBar() {
  const { openTerminal, setPanelOpen, setPanelTab, setPaletteOpen } = useIde();
  const { mode, toggleMode } = useTheme();

  return (
    <footer className={styles.bar}>
      <button
        type="button"
        className={styles.item}
        onClick={() => {
          setPanelOpen(true);
          setPanelTab("problems");
        }}
      >
        <Bell size={12} />
        {problems.length} Problems
      </button>
      <button type="button" className={`${styles.item} ${styles.hideMobile}`}>
        <GitBranch size={12} />
        main*
      </button>
      <span className={`${styles.muted} ${styles.hideMobile}`}>
        <Check size={12} style={{ verticalAlign: "middle" }} />{" "}
        {profile.availability}
      </span>
      <span className={`${styles.muted} ${styles.hideMobile}`}>
        {profile.location}
      </span>
      <div className={styles.spacer} />
      <button
        type="button"
        className={styles.item}
        onClick={() => {
          void navigator.clipboard?.writeText(profile.email);
        }}
        title={profile.email}
      >
        <Mail size={12} />
        Email
      </button>
      <a
        className={`${styles.item} ${styles.hideMobile}`}
        href={profile.linkedin}
        target="_blank"
        rel="noreferrer"
      >
        LinkedIn
      </a>
      <button
        type="button"
        className={styles.item}
        onClick={openTerminal}
        title="Terminal"
      >
        <Terminal size={12} />
      </button>
      <button
        type="button"
        className={styles.item}
        onClick={() => setPaletteOpen(true)}
      >
        ⌘P
      </button>
      <button
        type="button"
        className={styles.item}
        onClick={() => toggleMode()}
        aria-label="Toggle theme"
      >
        {mode === "dark" ? <Sun size={12} /> : <Moon size={12} />}
      </button>
    </footer>
  );
}
