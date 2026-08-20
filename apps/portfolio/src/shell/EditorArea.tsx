import { X } from "lucide-react";
import { getFile } from "@/content/workspace";
import { useIde } from "@/state/IdeContext";
import { FileView } from "@/views/FileView";
import styles from "./EditorArea.module.scss";

export function EditorArea() {
  const { openTabs, activeFileId, setActiveFile, closeTab } = useIde();
  const file = activeFileId ? getFile(activeFileId) : undefined;

  return (
    <section className={styles.area} aria-label="Editor">
      <div className={styles.tabs} role="tablist">
        {openTabs.map((id) => {
          const tabFile = getFile(id);
          const active = id === activeFileId;
          return (
            <div
              key={id}
              className={`${styles.tab} ${active ? styles.tabActive : ""}`}
              role="tab"
              tabIndex={active ? 0 : -1}
              aria-selected={active}
            >
              <button
                type="button"
                style={{
                  border: 0,
                  background: "transparent",
                  color: "inherit",
                  font: "inherit",
                  cursor: "pointer",
                  padding: 0,
                }}
                onClick={() => setActiveFile(id)}
              >
                {tabFile?.name ?? id}
              </button>
              <button
                type="button"
                className={styles.close}
                aria-label={`Close ${id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(id);
                }}
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>
      {file ? <div className={styles.breadcrumb}>{file.path}</div> : null}
      <div className={styles.content}>
        {file ? (
          <FileView file={file} />
        ) : (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>No file open</div>
            <p>Open a file from Explorer or press ⌘/Ctrl+P</p>
          </div>
        )}
      </div>
    </section>
  );
}
