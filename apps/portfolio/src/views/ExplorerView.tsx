import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  FileJson,
  FileText,
  Folder,
  FolderOpen,
  TerminalSquare,
} from "lucide-react";
import { useState } from "react";
import { explorerTree, type TreeNode } from "@/content/workspace";
import { useIde } from "@/state/IdeContext";
import styles from "./views.module.scss";

export function ExplorerView() {
  return (
    <div className={styles.tree}>
      {explorerTree.map((node) => (
        <TreeBranch key={node.id} node={node} depth={0} />
      ))}
    </div>
  );
}

function TreeBranch({ node, depth }: { node: TreeNode; depth: number }) {
  const { openFile, activeFileId } = useIde();
  const [expanded, setExpanded] = useState(depth < 2);
  const isFolder = Boolean(node.children?.length);
  const indentClass =
    depth === 0
      ? undefined
      : depth === 1
        ? styles.indent1
        : depth === 2
          ? styles.indent2
          : styles.indent3;

  if (isFolder) {
    return (
      <div>
        <button
          type="button"
          className={`${styles.treeBtn} ${styles.treeFolder} ${indentClass ?? ""}`}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? (
            <ChevronDown size={14} className={styles.iconMuted} />
          ) : (
            <ChevronRight size={14} className={styles.iconMuted} />
          )}
          {expanded ? (
            <FolderOpen size={14} className={styles.iconMuted} />
          ) : (
            <Folder size={14} className={styles.iconMuted} />
          )}
          {node.name}
        </button>
        {expanded
          ? node.children?.map((child) => (
              <TreeBranch key={child.id} node={child} depth={depth + 1} />
            ))
          : null}
      </div>
    );
  }

  const active = activeFileId === node.path;
  return (
    <button
      type="button"
      className={`${styles.treeBtn} ${indentClass ?? ""} ${active ? styles.treeBtnActive : ""}`}
      onClick={() => node.path && openFile(node.path)}
    >
      <span style={{ width: 14 }} />
      <FileIcon name={node.name} />
      {node.name}
    </button>
  );
}

function FileIcon({ name }: { name: string }) {
  if (name.endsWith(".json"))
    return <FileJson size={14} className={styles.iconMuted} />;
  if (name.endsWith(".sh"))
    return <TerminalSquare size={14} className={styles.iconMuted} />;
  if (name.endsWith(".md"))
    return <FileText size={14} className={styles.iconMuted} />;
  return <FileCode2 size={14} className={styles.iconMuted} />;
}
