import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getFile } from "@/content/workspace";

export type SidebarMode =
  | "explorer"
  | "search"
  | "scm"
  | "extensions"
  | "debug";

export type PanelTab = "terminal" | "problems";

export type MainView = "editor" | "agent";

type IdeContextValue = {
  mainView: MainView;
  openAgent: () => void;
  closeAgent: () => void;
  sidebarMode: SidebarMode;
  setSidebarMode: (mode: SidebarMode) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  openTabs: string[];
  activeFileId: string | null;
  openFile: (id: string) => void;
  closeTab: (id: string) => void;
  setActiveFile: (id: string) => void;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
  panelTab: PanelTab;
  setPanelTab: (tab: PanelTab) => void;
  openTerminal: () => void;
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  mobileMode: boolean;
};

const IdeContext = createContext<IdeContextValue | null>(null);

const DEFAULT_FILE = "README.md";

export function IdeProvider({ children }: { children: ReactNode }) {
  const [mainView, setMainView] = useState<MainView>("editor");
  const [sidebarMode, setSidebarModeState] = useState<SidebarMode>("explorer");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openTabs, setOpenTabs] = useState<string[]>([DEFAULT_FILE]);
  const [activeFileId, setActiveFileId] = useState<string | null>(DEFAULT_FILE);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>("terminal");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMode, setMobileMode] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => {
      const isMobile = mq.matches;
      setMobileMode(isMobile);
      if (isMobile) {
        setSidebarOpen(false);
      }
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const openAgent = useCallback(() => {
    setMainView("agent");
    setSidebarOpen(false);
    setPanelOpen(false);
  }, []);

  const closeAgent = useCallback(() => {
    setMainView("editor");
  }, []);

  const setSidebarMode = useCallback((mode: SidebarMode) => {
    setMainView("editor");
    setSidebarModeState((prev) => {
      if (prev === mode) {
        setSidebarOpen((open) => !open);
        return prev;
      }
      setSidebarOpen(true);
      return mode;
    });
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((v) => !v);
  }, []);

  const openFile = useCallback((id: string) => {
    setMainView("editor");
    if (id === "contact.sh") {
      setPanelOpen(true);
      setPanelTab("terminal");
      setOpenTabs((tabs) => (tabs.includes(id) ? tabs : [...tabs, id]));
      setActiveFileId(id);
      if (window.matchMedia("(max-width: 768px)").matches) {
        setSidebarOpen(false);
      }
      return;
    }
    if (!getFile(id)) return;
    setOpenTabs((tabs) => (tabs.includes(id) ? tabs : [...tabs, id]));
    setActiveFileId(id);
    if (window.matchMedia("(max-width: 768px)").matches) {
      setSidebarOpen(false);
    }
  }, []);

  const closeTab = useCallback((id: string) => {
    setOpenTabs((tabs) => {
      const next = tabs.filter((t) => t !== id);
      setActiveFileId((active) => {
        if (active !== id) return active;
        const idx = tabs.indexOf(id);
        const fallback = next[Math.max(0, idx - 1)] ?? next[0] ?? null;
        return fallback;
      });
      return next;
    });
  }, []);

  const setActiveFile = useCallback((id: string) => {
    setActiveFileId(id);
  }, []);

  const togglePanel = useCallback(() => {
    setPanelOpen((v) => !v);
  }, []);

  const openTerminal = useCallback(() => {
    setMainView("editor");
    setPanelOpen(true);
    setPanelTab("terminal");
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (meta && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (meta && e.key === "`") {
        e.preventDefault();
        setMainView("editor");
        setPanelOpen((v) => !v);
        setPanelTab("terminal");
        return;
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo<IdeContextValue>(
    () => ({
      mainView,
      openAgent,
      closeAgent,
      sidebarMode,
      setSidebarMode,
      sidebarOpen,
      setSidebarOpen,
      toggleSidebar,
      openTabs,
      activeFileId,
      openFile,
      closeTab,
      setActiveFile,
      panelOpen,
      setPanelOpen,
      togglePanel,
      panelTab,
      setPanelTab,
      openTerminal,
      paletteOpen,
      setPaletteOpen,
      searchQuery,
      setSearchQuery,
      mobileMode,
    }),
    [
      mainView,
      openAgent,
      closeAgent,
      sidebarMode,
      setSidebarMode,
      sidebarOpen,
      toggleSidebar,
      openTabs,
      activeFileId,
      openFile,
      closeTab,
      setActiveFile,
      panelOpen,
      togglePanel,
      panelTab,
      openTerminal,
      paletteOpen,
      searchQuery,
      mobileMode,
    ],
  );

  return <IdeContext.Provider value={value}>{children}</IdeContext.Provider>;
}

export function useIde() {
  const ctx = useContext(IdeContext);
  if (!ctx) throw new Error("useIde must be used within IdeProvider");
  return ctx;
}
