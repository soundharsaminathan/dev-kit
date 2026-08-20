import { ChevronDown, X } from "lucide-react";
import { useIde } from "@/state/IdeContext";
import { ProblemsView } from "@/views/ProblemsView";
import { TerminalView } from "@/views/TerminalView";
import styles from "./Panel.module.scss";

export function Panel() {
  const { panelOpen, panelTab, setPanelTab, setPanelOpen } = useIde();

  if (!panelOpen) return null;

  return (
    <section className={styles.panel} aria-label="Panel">
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${panelTab === "terminal" ? styles.tabActive : ""}`}
          onClick={() => setPanelTab("terminal")}
        >
          Terminal
        </button>
        <button
          type="button"
          className={`${styles.tab} ${panelTab === "problems" ? styles.tabActive : ""}`}
          onClick={() => setPanelTab("problems")}
        >
          Problems
        </button>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="Collapse panel"
            onClick={() => setPanelOpen(false)}
          >
            <ChevronDown size={14} />
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="Close panel"
            onClick={() => setPanelOpen(false)}
          >
            <X size={14} />
          </button>
        </div>
      </div>
      <div className={styles.body}>
        {panelTab === "terminal" ? <TerminalView /> : <ProblemsView />}
      </div>
    </section>
  );
}
