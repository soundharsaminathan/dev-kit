import { useEffect, useMemo, useRef, useState } from "react";
import { profile } from "@/content/profile";
import { allFileIds, files } from "@/content/workspace";
import { useTheme } from "@/lib/theme";
import { useIde } from "@/state/IdeContext";
import styles from "./CommandPalette.module.scss";

type PaletteItem = {
  id: string;
  label: string;
  meta: string;
  run: () => void;
};

export function CommandPalette() {
  const {
    paletteOpen,
    setPaletteOpen,
    openFile,
    openTerminal,
    setSidebarMode,
    setPanelOpen,
    setPanelTab,
    openAgent,
  } = useIde();
  const { toggleMode } = useTheme();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo<PaletteItem[]>(() => {
    const fileItems: PaletteItem[] = allFileIds.map((id) => ({
      id: `file:${id}`,
      label: files[id]?.title ?? id,
      meta: id,
      run: () => openFile(id),
    }));
    const actions: PaletteItem[] = [
      {
        id: "action:agent",
        label: "Open Agent",
        meta: "view",
        run: openAgent,
      },
      {
        id: "action:terminal",
        label: "Open Contact Terminal",
        meta: "action",
        run: openTerminal,
      },
      {
        id: "action:problems",
        label: "Show Problems",
        meta: "action",
        run: () => {
          setPanelOpen(true);
          setPanelTab("problems");
        },
      },
      {
        id: "action:theme",
        label: "Toggle Color Theme",
        meta: "action",
        run: () => toggleMode(),
      },
      {
        id: "action:email",
        label: "Copy Email",
        meta: profile.email,
        run: () => {
          void navigator.clipboard?.writeText(profile.email);
        },
      },
      {
        id: "action:explorer",
        label: "Focus on Explorer View",
        meta: "view",
        run: () => setSidebarMode("explorer"),
      },
      {
        id: "action:scm",
        label: "Focus on Source Control View",
        meta: "view",
        run: () => setSidebarMode("scm"),
      },
      {
        id: "action:ext",
        label: "Focus on Extensions View",
        meta: "view",
        run: () => setSidebarMode("extensions"),
      },
      {
        id: "action:debug",
        label: "Focus on Run and Debug View",
        meta: "view",
        run: () => setSidebarMode("debug"),
      },
    ];
    return [...actions, ...fileItems];
  }, [
    openAgent,
    openFile,
    openTerminal,
    setPanelOpen,
    setPanelTab,
    setSidebarMode,
    toggleMode,
  ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.meta.toLowerCase().includes(q),
    );
  }, [items, query]);

  useEffect(() => {
    if (paletteOpen) {
      setQuery("");
      setIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [paletteOpen]);

  if (!paletteOpen) return null;

  const runSelected = (item?: PaletteItem) => {
    const target = item ?? filtered[index];
    if (!target) return;
    target.run();
    setPaletteOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className={styles.overlay}
        aria-label="Close command palette"
        onClick={() => setPaletteOpen(false)}
      />
      <div
        className={styles.palette}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <input
          ref={inputRef}
          className={styles.input}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          placeholder="Type a command or file name…"
          aria-label="Command palette search"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex((i) =>
                Math.min(i + 1, Math.max(filtered.length - 1, 0)),
              );
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              runSelected();
            } else if (e.key === "Escape") {
              setPaletteOpen(false);
            }
          }}
        />
        <div className={styles.list} role="listbox">
          {filtered.length === 0 ? (
            <div className={styles.empty}>No matching commands</div>
          ) : (
            filtered.map((item, i) => (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={i === index}
                className={`${styles.item} ${i === index ? styles.itemActive : ""}`}
                onMouseEnter={() => setIndex(i)}
                onClick={() => runSelected(item)}
              >
                <span>{item.label}</span>
                <span className={styles.itemMeta}>{item.meta}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}
