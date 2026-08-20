import {
  Blocks,
  Bot,
  Bug,
  Files,
  GitBranch,
  Search,
  Settings,
} from "lucide-react";
import { useTheme } from "@/lib/theme";
import type { SidebarMode } from "@/state/IdeContext";
import { useIde } from "@/state/IdeContext";
import styles from "./ActivityBar.module.scss";

const items: { id: SidebarMode; label: string; icon: typeof Files }[] = [
  { id: "explorer", label: "Explorer", icon: Files },
  { id: "search", label: "Search", icon: Search },
  { id: "scm", label: "Source Control", icon: GitBranch },
  { id: "extensions", label: "Extensions", icon: Blocks },
  { id: "debug", label: "Run and Debug", icon: Bug },
];

export function ActivityBar({ className }: { className?: string | undefined }) {
  const { sidebarMode, setSidebarMode, setPaletteOpen, mainView, openAgent } =
    useIde();
  const { toggleMode } = useTheme();

  return (
    <nav className={`${styles.bar} ${className ?? ""}`} aria-label="Activity">
      {items.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={`${styles.btn} ${mainView === "editor" && sidebarMode === id ? styles.btnActive : ""}`}
          aria-label={label}
          aria-pressed={mainView === "editor" && sidebarMode === id}
          title={label}
          onClick={() => setSidebarMode(id)}
        >
          <Icon size={22} strokeWidth={1.6} />
        </button>
      ))}
      <button
        type="button"
        className={`${styles.btn} ${mainView === "agent" ? styles.btnActive : ""}`}
        aria-label="Agent"
        aria-pressed={mainView === "agent"}
        title="Agent"
        onClick={() => openAgent()}
      >
        <Bot size={22} strokeWidth={1.6} />
      </button>
      <div className={styles.spacer} />
      <button
        type="button"
        className={styles.btn}
        aria-label="Command palette"
        title="Command Palette"
        onClick={() => setPaletteOpen(true)}
      >
        <Search size={20} strokeWidth={1.6} />
      </button>
      <button
        type="button"
        className={styles.btn}
        aria-label="Toggle theme"
        title="Toggle theme"
        onClick={() => toggleMode()}
      >
        <Settings size={20} strokeWidth={1.6} />
      </button>
    </nav>
  );
}
