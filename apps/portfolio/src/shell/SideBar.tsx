import { useIde } from "@/state/IdeContext";
import { DebugView } from "@/views/DebugView";
import { ExplorerView } from "@/views/ExplorerView";
import { ExtensionsView } from "@/views/ExtensionsView";
import { SearchView } from "@/views/SearchView";
import { SourceControlView } from "@/views/SourceControlView";
import styles from "./SideBar.module.scss";

const titles: Record<string, string> = {
  explorer: "Explorer",
  search: "Search",
  scm: "Source Control",
  extensions: "Extensions",
  debug: "Run and Debug",
};

export function SideBar() {
  const { sidebarMode, sidebarOpen } = useIde();

  if (!sidebarOpen) {
    return <aside className={styles.closed} aria-hidden />;
  }

  return (
    <aside className={styles.sidebar} aria-label={titles[sidebarMode]}>
      <div className={styles.header}>{titles[sidebarMode]}</div>
      <div className={styles.body}>
        {sidebarMode === "explorer" ? <ExplorerView /> : null}
        {sidebarMode === "search" ? <SearchView /> : null}
        {sidebarMode === "scm" ? <SourceControlView /> : null}
        {sidebarMode === "extensions" ? <ExtensionsView /> : null}
        {sidebarMode === "debug" ? <DebugView /> : null}
      </div>
    </aside>
  );
}
