import type { ReactNode } from "react";
import { profile } from "@/content/profile";
import { useIde } from "@/state/IdeContext";
import styles from "./views.module.scss";

/** Minimal markdown-ish renderer for portfolio content (no full MDX). */
export function MarkdownView({
  body,
  sample = false,
  hero = false,
}: {
  body: string;
  sample?: boolean;
  hero?: boolean;
}) {
  const { openTerminal, setPaletteOpen } = useIde();
  const blocks = parseBlocks(body);

  return (
    <article className={styles.view}>
      {sample ? (
        <div className={styles.badge}>Sample data · TODO: replace</div>
      ) : null}
      {hero ? (
        <>
          <h1 className={styles.brand}>{profile.name}</h1>
          <p className={styles.role}>{profile.role}</p>
          <p className={styles.p}>{profile.tagline}</p>
          <div className={styles.heroActions}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={openTerminal}
            >
              Open Contact
            </button>
            <button
              type="button"
              className={styles.btn}
              onClick={() => setPaletteOpen(true)}
            >
              Command Palette
            </button>
          </div>
        </>
      ) : null}
      {blocks.map((block) => (
        <Block
          key={`${block.type}-${"text" in block ? block.text : "rows" in block ? block.rows.map((r) => r.join("|")).join(";") : "hr"}`}
          block={block}
          skipFirstH1={hero}
        />
      ))}
    </article>
  );
}

type Block =
  | { type: "h1" | "h2" | "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "li"; text: string }
  | { type: "quote"; text: string }
  | { type: "table"; rows: string[][] }
  | { type: "hr" };

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (!line.trim()) {
      i += 1;
      continue;
    }
    if (line.startsWith("<!--")) {
      i += 1;
      continue;
    }
    if (line.trim() === "---") {
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push({ type: "h1", text: line.slice(2) });
      i += 1;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({ type: "h2", text: line.slice(3) });
      i += 1;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push({ type: "h3", text: line.slice(4) });
      i += 1;
      continue;
    }
    if (line.startsWith("> ")) {
      blocks.push({ type: "quote", text: line.slice(2) });
      i += 1;
      continue;
    }
    if (line.startsWith("| ")) {
      const rows: string[][] = [];
      while (i < lines.length && (lines[i] ?? "").startsWith("|")) {
        const raw = lines[i] ?? "";
        if (!/^\|\s*-/.test(raw)) {
          rows.push(
            raw
              .split("|")
              .slice(1, -1)
              .map((c) => c.trim()),
          );
        }
        i += 1;
      }
      blocks.push({ type: "table", rows });
      continue;
    }
    if (line.startsWith("- ")) {
      blocks.push({ type: "li", text: line.slice(2) });
      i += 1;
      continue;
    }
    blocks.push({ type: "p", text: line });
    i += 1;
  }
  return blocks;
}

function Block({
  block,
  skipFirstH1 = false,
}: {
  block: Block;
  skipFirstH1?: boolean;
}) {
  if (block.type === "h1" && skipFirstH1) return null;
  if (block.type === "hr")
    return <hr style={{ borderColor: "var(--ide-border)" }} />;
  if (block.type === "h1")
    return <h1 className={styles.h1}>{renderInline(block.text)}</h1>;
  if (block.type === "h2")
    return <h2 className={styles.h2}>{renderInline(block.text)}</h2>;
  if (block.type === "h3")
    return <h3 className={styles.h3}>{renderInline(block.text)}</h3>;
  if (block.type === "quote")
    return (
      <blockquote className={styles.blockquote}>
        {renderInline(block.text)}
      </blockquote>
    );
  if (block.type === "li")
    return <li className={styles.li}>{renderInline(block.text)}</li>;
  if (block.type === "table") {
    const [head, ...body] = block.rows;
    return (
      <table className={styles.table}>
        {head ? (
          <thead>
            <tr>
              {head.map((c) => (
                <th key={c}>{renderInline(c)}</th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {body.map((row) => (
            <tr key={row.join("|")}>
              {row.map((c) => (
                <td key={c}>{renderInline(c)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  return <p className={styles.p}>{renderInline(block.text)}</p>;
}

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.filter(Boolean).map((part) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const content = part.slice(2, -2);
      return <strong key={`b-${content}`}>{content}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      const content = part.slice(1, -1);
      return (
        <code key={`c-${content}`} className={styles.inlineCode}>
          {content}
        </code>
      );
    }
    return <span key={`t-${part}`}>{part}</span>;
  });
}
