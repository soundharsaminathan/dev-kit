import { Bot, RotateCcw, Send, X } from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { profile } from "@/content/profile";
import { useIde } from "@/state/IdeContext";
import { answerFromPortfolio } from "./localAnswer";
import styles from "./AgentWindow.module.scss";

type UiMessage = {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
};

const SUGGESTIONS = [
  "What is your background?",
  "When did you finish college?",
  "What skills do you have?",
  "How can I contact you?",
];

function agentChatUrl(): string {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, "/");
  return `${base}api/agent/chat`;
}

function lastUserContent(
  messages: { role: "user" | "assistant"; content: string }[],
): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m?.role === "user") return m.content;
  }
  return "";
}

async function askAgent(
  messages: { role: "user" | "assistant"; content: string }[],
): Promise<string> {
  const question = lastUserContent(messages);
  try {
    const res = await fetch(agentChatUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    const data = (await res.json()) as {
      reply?: string;
      error?: string;
      code?: string;
    };
    if (res.ok && data.reply) return data.reply;
  } catch {
    // Static Cloudflare Pages has no Vite agent middleware — use local answers.
  }
  return answerFromPortfolio(question);
}

export function AgentWindow() {
  const { closeAgent } = useIde();
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const idPrefix = useId();
  const seq = useRef(0);

  const nextId = () => {
    seq.current += 1;
    return `${idPrefix}-${seq.current}`;
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Scroll when conversation updates
  // biome-ignore lint/correctness/useExhaustiveDependencies: messages/pending intentionally trigger scroll
  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, pending]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || pending) return;

    const userMsg: UiMessage = {
      id: nextId(),
      role: "user",
      content,
    };
    const history = [...messages, userMsg].filter(
      (m): m is UiMessage & { role: "user" | "assistant" } =>
        m.role === "user" || m.role === "assistant",
    );

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setPending(true);

    try {
      const reply = await askAgent(
        history.map((m) => ({ role: m.role, content: m.content })),
      );
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "assistant", content: reply },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "error",
          content:
            error instanceof Error
              ? error.message
              : "Something went wrong talking to the agent.",
        },
      ]);
    } finally {
      setPending(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  return (
    <section className={styles.window} aria-label="Portfolio agent">
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.badge}>
            <Bot size={12} />
            Agent
          </span>
          <div className={styles.titleBlock}>
            <div className={styles.title}>{profile.name} · Free Agent</div>
            <div className={styles.subtitle}>
              Ask about experience, skills, education, and projects · powered by
              Groq
            </div>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="Clear conversation"
            title="Clear conversation"
            onClick={() => setMessages([])}
            disabled={pending || messages.length === 0}
          >
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="Close agent"
            title="Back to editor"
            onClick={() => closeAgent()}
          >
            <X size={16} />
          </button>
        </div>
      </header>

      <div className={styles.messages} ref={listRef}>
        {messages.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>Ask the portfolio agent</div>
            <p className={styles.emptyBody}>
              I only answer from {profile.name}&apos;s portfolio data —
              education (2014–2018), skills, experience, and projects.
            </p>
            <div className={styles.suggestions}>
              {SUGGESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  className={styles.chip}
                  onClick={() => void send(q)}
                  disabled={pending}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`${styles.bubble} ${
                m.role === "user"
                  ? styles.bubbleUser
                  : m.role === "error"
                    ? styles.bubbleError
                    : styles.bubbleAssistant
              }`}
            >
              <div className={styles.roleLabel}>
                {m.role === "user"
                  ? "You"
                  : m.role === "error"
                    ? "Error"
                    : "Agent"}
              </div>
              {m.content}
            </div>
          ))
        )}
        {pending ? (
          <div className={`${styles.bubble} ${styles.bubbleAssistant}`}>
            <div className={styles.roleLabel}>Agent</div>
            Thinking…
          </div>
        ) : null}
      </div>

      <form className={styles.composer} onSubmit={onSubmit}>
        <div className={styles.composerInner}>
          <textarea
            ref={inputRef}
            className={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about Soundhar’s portfolio…"
            rows={2}
            disabled={pending}
            aria-label="Message the agent"
          />
          <button
            type="submit"
            className={styles.send}
            disabled={pending || !input.trim()}
          >
            <Send size={14} />
            Send
          </button>
        </div>
        <div className={styles.hint}>
          Enter to send · Shift+Enter for newline · works offline from portfolio
          data; set GROQ_API_KEY in apps/portfolio/.env for Groq answers
        </div>
      </form>
    </section>
  );
}
