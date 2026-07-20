import { Blocks, Bug, Files, GitBranch, Search, Terminal } from "lucide-react";
import type { SidebarMode } from "@/state/IdeContext";
import { useIde } from "@/state/IdeContext";
import styles from "./MobileNav.module.scss";

const items: {
  id: SidebarMode | "terminal";
  label: string;
  icon: typeof Files;
}[] = [
  { id: "explorer", label: "Files", icon: Files },
  { id: "scm", label: "Git", icon: GitBranch },
  { id: "extensions", label: "Skills", icon: Blocks },
  { id: "debug", label: "Debug", icon: Bug },
  { id: "search", label: "Search", icon: Search },
  { id: "terminal", label: "Term", icon: Terminal },
];

export function MobileNav() {
  const {
    sidebarMode,
    setSidebarMode,
    openTerminal,
    sidebarOpen,
    setSidebarOpen,
  } = useIde();

  return (
    <nav className={styles.nav} aria-label="Mobile navigation">
      {items.map(({ id, label, icon: Icon }) => {
        const active =
          id === "terminal" ? false : sidebarOpen && sidebarMode === id;
        return (
          <button
            key={id}
            type="button"
            className={`${styles.btn} ${active ? styles.btnActive : ""}`}
            onClick={() => {
              if (id === "terminal") {
                openTerminal();
                setSidebarOpen(false);
                return;
              }
              if (sidebarOpen && sidebarMode === id) {
                setSidebarOpen(false);
              } else {
                setSidebarMode(id);
                setSidebarOpen(true);
              }
            }}
          >
            <Icon size={18} strokeWidth={1.7} />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
