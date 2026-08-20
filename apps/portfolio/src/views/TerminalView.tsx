import { useEffect, useId, useRef, useState } from "react";
import { profile } from "@/content/profile";
import { allFileIds, files } from "@/content/workspace";
import { useIde } from "@/state/IdeContext";
import styles from "./views.module.scss";

type Line = { id: string; text: string; tone?: "muted" | "accent" | "ok" };

function createWelcome(): Line[] {
  return [
    {
      id: "welcome-1",
      text: `Welcome to ${profile.workspaceName} contact shell.`,
      tone: "accent",
    },
    { id: "welcome-2", text: "Type `help` for commands.", tone: "muted" },
  ];
}

export function TerminalView() {
  const [lines, setLines] = useState<Line[]>(createWelcome);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { openFile } = useIde();
  const idPrefix = useId();
  const seq = useRef(0);
  const lineCount = lines.length;

  const nextId = () => {
    seq.current += 1;
    return `${idPrefix}-${seq.current}`;
  };

  // Scroll when output grows — biome misunderstands this dependency
  // biome-ignore lint/correctness/useExhaustiveDependencies: lineCount intentionally triggers scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lineCount]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const run = (raw: string) => {
    const cmd = raw.trim().toLowerCase();
    const next: Line[] = [...lines, { id: nextId(), text: `❯ ${raw}` }];
    if (!cmd) {
      setLines(next);
      return;
    }
    switch (cmd) {
      case "help":
        next.push({
          id: nextId(),
          text: "Commands: help, about, email, socials, open <file>, clear, whoami",
          tone: "muted",
        });
        break;
      case "about":
        next.push({
          id: nextId(),
          text: `${profile.fullName} — ${profile.role}`,
        });
        next.push({
          id: nextId(),
          text: profile.tagline,
          tone: "muted",
        });
        break;
      case "email":
        next.push({ id: nextId(), text: profile.email, tone: "ok" });
        void navigator.clipboard?.writeText(profile.email);
        next.push({
          id: nextId(),
          text: "(copied to clipboard when available)",
          tone: "muted",
        });
        break;
      case "socials":
        next.push({
          id: nextId(),
          text: `LinkedIn ${profile.linkedin}`,
          tone: "ok",
        });
        break;
      case "whoami":
        next.push({ id: nextId(), text: profile.name });
        break;
      case "clear":
        setLines([]);
        setInput("");
        return;
      default: {
        if (cmd.startsWith("open ")) {
          const target = raw.trim().slice(5).trim();
          const match =
            allFileIds.find((id) => id === target) ??
            allFileIds.find((id) => id.endsWith(target));
          if (match && files[match]) {
            openFile(match);
            next.push({
              id: nextId(),
              text: `Opened ${match}`,
              tone: "ok",
            });
          } else {
            next.push({
              id: nextId(),
              text: `File not found: ${target}`,
              tone: "muted",
            });
          }
        } else {
          next.push({
            id: nextId(),
            text: `Command not found: ${cmd}. Try help.`,
            tone: "muted",
          });
        }
      }
    }
    setLines(next);
    setInput("");
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: click focuses the terminal input
    <div
      className={styles.terminal}
      onClick={() => inputRef.current?.focus()}
      onKeyDown={() => undefined}
    >
      <div className={styles.termOut}>
        {lines.map((line) => (
          <div
            key={line.id}
            className={
              line.tone === "muted"
                ? styles.termLineMuted
                : line.tone === "accent"
                  ? styles.termLineAccent
                  : line.tone === "ok"
                    ? styles.termLineOk
                    : undefined
            }
          >
            {line.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className={styles.termPromptRow}>
        <span className={styles.prompt}>❯</span>
        <input
          ref={inputRef}
          className={styles.termInput}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") run(input);
          }}
          aria-label="Terminal input"
          spellCheck={false}
          autoComplete="off"
        />
      </div>
    </div>
  );
}
