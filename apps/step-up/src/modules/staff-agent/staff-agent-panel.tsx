import { Icon } from "@dev-ui/icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { ApiError } from "@/lib/api";
import { useApi } from "@/lib/api-context";
import { useStudioId } from "@/lib/use-studio-id";
import styles from "./staff-agent.module.scss";
import {
  blobToBase64,
  createVoiceRecorder,
  MAX_AGENT_AUDIO_SECONDS,
} from "./voice-recorder";

type UiMessage = {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
  actions?: Array<{ tool: string; ok: boolean; summary: string }>;
};

type ChatResponse = {
  transcript?: string;
  reply: string;
  actions: Array<{ tool: string; ok: boolean; summary: string }>;
  audioBase64?: string;
  model: string;
};

const SUGGESTIONS = [
  "Add a lead named",
  "Add a remark for",
  "Book a trial for",
  "Move this student to another batch",
];

function playAudioBase64(base64: string) {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    void audio.play().finally(() => {
      URL.revokeObjectURL(url);
    });
    return true;
  } catch {
    return false;
  }
}

function speakFallback(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text.slice(0, 500));
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export function StaffAgentPanel({ onClose }: { onClose?: () => void }) {
  const api = useApi();
  const studioId = useStudioId();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recorderRef = useRef<ReturnType<typeof createVoiceRecorder> | null>(
    null,
  );
  const idPrefix = useId();
  const seq = useRef(0);

  const nextId = () => {
    seq.current += 1;
    return `${idPrefix}-${seq.current}`;
  };

  useEffect(() => {
    inputRef.current?.focus();
    return () => {
      recorderRef.current?.cancel();
    };
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on conversation updates
  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, pending, recording]);

  const invalidateCrm = async () => {
    if (!studioId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["studio-leads", studioId] }),
      queryClient.invalidateQueries({
        queryKey: ["student-directory", studioId],
      }),
      queryClient.invalidateQueries({ queryKey: ["trial-slots", studioId] }),
      queryClient.invalidateQueries({ queryKey: ["batches"] }),
    ]);
  };

  const askAgent = async (body: {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    voice?: boolean;
    audioBase64?: string;
    audioMimeType?: string;
  }) => {
    return api.post<ChatResponse>("/staff-agent/chat", body);
  };

  const finishTurn = async (
    history: Array<{ role: "user" | "assistant"; content: string }>,
    options: {
      voice?: boolean;
      audioBase64?: string;
      audioMimeType?: string;
      displayUserContent: string;
    },
  ) => {
    const userMsg: UiMessage = {
      id: nextId(),
      role: "user",
      content: options.displayUserContent,
    };
    setMessages((prev) => [...prev, userMsg]);
    setPending(true);

    try {
      const requestBody: {
        messages: Array<{ role: "user" | "assistant"; content: string }>;
        voice?: boolean;
        audioBase64?: string;
        audioMimeType?: string;
      } = { messages: history };
      if (options.voice) {
        requestBody.voice = true;
      }
      if (options.audioBase64) {
        requestBody.audioBase64 = options.audioBase64;
      }
      if (options.audioMimeType) {
        requestBody.audioMimeType = options.audioMimeType;
      }

      const result = await askAgent(requestBody);

      if (result.transcript) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === userMsg.id ? { ...m, content: result.transcript! } : m,
          ),
        );
      }

      const replyText = result.reply;
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "assistant",
          content: replyText,
          actions: result.actions?.filter((a) => a.ok) ?? [],
        },
      ]);

      if (result.actions?.some((a) => a.ok)) {
        await invalidateCrm();
      }

      if (options.voice || options.audioBase64) {
        const played = result.audioBase64
          ? playAudioBase64(result.audioBase64)
          : false;
        if (!played) {
          speakFallback(replyText);
        }
      }
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Something went wrong talking to the agent.";
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "error", content: message },
      ]);
    } finally {
      setPending(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const sendText = async (text: string) => {
    const content = text.trim();
    if (!content || pending || recording) return;

    const history = [
      ...messages
        .filter(
          (m): m is UiMessage & { role: "user" | "assistant" } =>
            m.role === "user" || m.role === "assistant",
        )
        .map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content },
    ];
    setInput("");
    await finishTurn(history, { displayUserContent: content });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendText(input);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendText(input);
    }
  };

  const toggleRecording = async () => {
    if (pending) return;

    if (recording) {
      const recordingResult = await recorderRef.current?.stop();
      setRecording(false);
      setRecordingSeconds(0);
      recorderRef.current = null;
      if (!recordingResult) {
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "error",
            content: "Recording was empty. Try again.",
          },
        ]);
        return;
      }

      const audioBase64 = await blobToBase64(recordingResult.blob);
      const history = messages
        .filter(
          (m): m is UiMessage & { role: "user" | "assistant" } =>
            m.role === "user" || m.role === "assistant",
        )
        .map((m) => ({ role: m.role, content: m.content }));

      await finishTurn(history, {
        voice: true,
        audioBase64,
        audioMimeType: recordingResult.mimeType,
        displayUserContent: "🎤 Voice message",
      });
      return;
    }

    const recorder = createVoiceRecorder({
      onTick: setRecordingSeconds,
      onError: (message) => {
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: "error", content: message },
        ]);
        setRecording(false);
      },
    });
    recorderRef.current = recorder;
    try {
      await recorder.start();
      setRecording(true);
      setRecordingSeconds(0);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "error",
          content: "Could not access the microphone.",
        },
      ]);
      recorderRef.current = null;
    }
  };

  return (
    <section className={styles.panel} aria-label="Staff CRM agent">
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <span className={styles.title}>Studio agent</span>
          <span className={styles.subtitle}>
            Create leads, remarks, trials, and batch moves
          </span>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="Clear conversation"
            title="Clear conversation"
            disabled={pending || messages.length === 0}
            onClick={() => setMessages([])}
          >
            <Icon name="refresh" />
          </button>
          {onClose ? (
            <button
              type="button"
              className={styles.iconBtn}
              aria-label="Close agent"
              onClick={onClose}
            >
              <Icon name="x" />
            </button>
          ) : null}
        </div>
      </header>

      <div className={styles.messages} ref={listRef}>
        {messages.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.suggestions}>
              {SUGGESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  className={styles.chip}
                  disabled={pending}
                  onClick={() => {
                    setInput(`${q} `);
                    inputRef.current?.focus();
                  }}
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
              {m.actions && m.actions.length > 0 ? (
                <div className={styles.actions}>
                  {m.actions.map((action) => (
                    <div key={`${m.id}-${action.tool}-${action.summary}`}>
                      ✓ {action.summary}
                    </div>
                  ))}
                </div>
              ) : null}
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
        {recording ? (
          <div className={styles.recordingHint}>
            Recording… {recordingSeconds}s / {MAX_AGENT_AUDIO_SECONDS}s — tap
            mic to send
          </div>
        ) : null}
        <div className={styles.composerRow}>
          <textarea
            ref={inputRef}
            className={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask to add a lead, remark, trial…"
            rows={2}
            disabled={pending || recording}
            aria-label="Message the studio agent"
          />
          <button
            type="button"
            className={styles.mic}
            data-recording={recording ? "true" : undefined}
            aria-label={
              recording ? "Stop and send recording" : "Start recording"
            }
            data-testid="staff-agent-mic"
            disabled={pending}
            onClick={() => void toggleRecording()}
          >
            <Icon name="mic" />
          </button>
          <button
            type="submit"
            className={styles.send}
            disabled={pending || recording || !input.trim()}
            data-testid="staff-agent-send"
          >
            <Icon name="send" />
          </button>
        </div>
        <div className={styles.hint}>
          Enter to send · mic for turn-based voice · archive and batch moves
          need confirmation
        </div>
      </form>
    </section>
  );
}
