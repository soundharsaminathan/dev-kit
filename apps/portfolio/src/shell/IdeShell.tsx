import { useIde } from "@/state/IdeContext";
import { ActivityBar } from "./ActivityBar";
import { CommandPalette } from "./CommandPalette";
import { EditorArea } from "./EditorArea";
import styles from "./IdeShell.module.scss";
import { MobileNav } from "./MobileNav";
import { Panel } from "./Panel";
import { SideBar } from "./SideBar";
import { StatusBar } from "./StatusBar";
import { TitleBar } from "./TitleBar";

export function IdeShell() {
  const { sidebarOpen, mobileMode, setSidebarOpen } = useIde();

  return (
    <div className={styles.shell}>
      <TitleBar />
      <div
        className={`${styles.body} ${!sidebarOpen && !mobileMode ? styles.bodySidebarClosed : ""}`}
      >
        {!mobileMode ? (
          <ActivityBar className={styles.activityHiddenOnMobile} />
        ) : null}
        {mobileMode && sidebarOpen ? (
          <div className={styles.sidebarOverlay}>
            <button
              type="button"
              className={styles.sidebarBackdrop}
              aria-label="Close sidebar"
              onClick={() => setSidebarOpen(false)}
            />
            <SideBar />
          </div>
        ) : null}
        {!mobileMode ? <SideBar /> : null}
        <div className={styles.mainColumn}>
          <div className={styles.editorStack}>
            <EditorArea />
          </div>
          <div className={styles.panelSlot}>
            <Panel />
          </div>
        </div>
      </div>
      <StatusBar />
      {mobileMode ? <MobileNav /> : null}
      <CommandPalette />
    </div>
  );
}
