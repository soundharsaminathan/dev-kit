import { Button } from "@dev-ui/components/button";
import { FileTrigger } from "@dev-ui/components/file-trigger";
import { Text } from "@dev-ui/components/text";
import { useIsMobile, useOnlineStatus } from "@dev-ui/hooks";
import { Icon } from "@dev-ui/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import {
  appendMessageToCache,
  chatConversationsKey,
  useChatSocket,
} from "@/lib/chat-socket";
import {
  TooltipIconBar,
  TooltipIconBarItem,
} from "@/modules/ui/tooltip-icon-bar";
import { ChatTooltip } from "./chat-tooltip";
import styles from "./composer.module.scss";
import {
  deliverPendingSend,
  type PendingChatSend,
  queueOptimisticSend,
} from "./optimistic-send";
import type { ChatLocation, ChatMessage } from "./types";
import {
  audioExtensionForMime,
  formatAudioDuration,
  MAX_CHAT_AUDIO_SECONDS,
  MAX_CHAT_IMAGES,
  pickRecorderMimeType,
} from "./upload";
import { VoiceNotePlayer } from "./voice-note-player";

type AttachmentMode = "none" | "poll" | "event" | "location";

type VoiceDraft = {
  file: File;
  url: string;
  duration: number;
};

type ComposerProps = {
  conversationId: string;
  replyTo?: ChatMessage | null;
  onCancelReply?: () => void;
};

export function Composer({
  conversationId,
  replyTo,
  onCancelReply,
}: ComposerProps) {
  const api = useApi();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { socket } = useChatSocket();
  const online = useOnlineStatus();
  const isMobile = useIsMobile();

  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [mode, setMode] = useState<AttachmentMode>("none");
  const [error, setError] = useState<string | null>(null);

  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<
    { id: string; value: string }[]
  >([
    { id: crypto.randomUUID(), value: "" },
    { id: crypto.randomUUID(), value: "" },
  ]);
  const [pollMulti, setPollMulti] = useState(false);

  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventPlace, setEventPlace] = useState("");

  const [location, setLocation] = useState<ChatLocation | null>(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [locating, setLocating] = useState(false);

  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceDraft, setVoiceDraft] = useState<VoiceDraft | null>(null);

  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voiceDraftUrlRef = useRef<string | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  function resizeTextArea() {
    const el = textAreaRef.current;
    if (!el) {
      return;
    }
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }

  useEffect(() => {
    resizeTextArea();
  });

  useEffect(() => {
    if (replyTo) {
      textAreaRef.current?.focus();
    }
  }, [replyTo]);

  useEffect(() => {
    return () => {
      if (typingRef.current) {
        clearTimeout(typingRef.current);
      }
      mediaStreamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (voiceDraftUrlRef.current) {
        URL.revokeObjectURL(voiceDraftUrlRef.current);
      }
    };
  }, []);

  function stopRecordingTracks() {
    mediaStreamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
  }

  function clearRecordingTimer() {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }

  function clearVoiceDraft({ revoke = true }: { revoke?: boolean } = {}) {
    if (revoke && voiceDraftUrlRef.current) {
      URL.revokeObjectURL(voiceDraftUrlRef.current);
    }
    voiceDraftUrlRef.current = null;
    setVoiceDraft(null);
  }

  function signalTyping() {
    if (!socket) {
      return;
    }
    socket.emit("typing.start", { conversationId });
    if (typingRef.current) {
      clearTimeout(typingRef.current);
    }
    typingRef.current = setTimeout(() => {
      socket.emit("typing.stop", { conversationId });
    }, 2000);
  }

  function stopTyping() {
    if (typingRef.current) {
      clearTimeout(typingRef.current);
      typingRef.current = null;
    }
    socket?.emit("typing.stop", { conversationId });
  }

  function afterSend(message: ChatMessage) {
    appendMessageToCache(queryClient, message);
    void queryClient.invalidateQueries({ queryKey: chatConversationsKey });
  }

  function resetComposer({
    revokeVoice = true,
  }: {
    revokeVoice?: boolean;
  } = {}) {
    setText("");
    setFiles([]);
    setPreviews([]);
    setMode("none");
    setError(null);
    setPollQuestion("");
    setPollOptions([
      { id: crypto.randomUUID(), value: "" },
      { id: crypto.randomUUID(), value: "" },
    ]);
    setPollMulti(false);
    setEventTitle("");
    setEventDate("");
    setEventTime("");
    setEventPlace("");
    setLocation(null);
    setLocationLabel("");
    clearVoiceDraft({ revoke: revokeVoice });
    onCancelReply?.();
  }

  function captureSendPayload(): PendingChatSend | null {
    if (!user) {
      return null;
    }
    const canQueue =
      Boolean(voiceDraft) ||
      text.trim().length > 0 ||
      files.length > 0 ||
      location !== null;
    if (!canQueue) {
      return null;
    }

    return {
      clientId: crypto.randomUUID(),
      conversationId,
      text,
      files: [...files],
      localImageUrls: [...previews],
      voiceFile: voiceDraft?.file ?? null,
      localAudioUrl: voiceDraft?.url ?? null,
      audioDuration: voiceDraft?.duration ?? null,
      location,
      locationLabel,
      replyTo: replyTo
        ? {
            id: replyTo.id,
            senderId: replyTo.sender.id,
            senderName: replyTo.sender.name,
            type: replyTo.type,
            text: replyTo.text,
            deleted: replyTo.deleted,
          }
        : null,
      sender: {
        id: user.id,
        name: user.name,
        photoUrl: user.photoUrl ?? null,
        role: user.role,
      },
    };
  }

  function keepComposerFocused() {
    // Keep the soft keyboard open for consecutive sends on mobile.
    requestAnimationFrame(() => {
      textAreaRef.current?.focus({ preventScroll: true });
    });
  }

  function sendNow() {
    const payload = captureSendPayload();
    if (!payload) {
      return;
    }

    queueOptimisticSend(queryClient, payload, {
      sendStatus: online ? "sending" : "queued",
    });
    resetComposer({ revokeVoice: false });
    stopTyping();
    keepComposerFocused();

    if (online) {
      void deliverPendingSend(api, queryClient, payload).catch(() => {
        // Queued/failed status is shown on the message bubble.
      });
    }
  }

  const pollMutation = useMutation({
    mutationFn: () =>
      api.post<ChatMessage>(`/chat/conversations/${conversationId}/polls`, {
        question: pollQuestion.trim(),
        options: pollOptions
          .map((option) => option.value.trim())
          .filter(Boolean),
        multiSelect: pollMulti,
      }),
    onSuccess: (message) => {
      afterSend(message);
      resetComposer();
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Could not create poll.");
    },
  });

  const eventMutation = useMutation({
    mutationFn: () => {
      const startsAt = new Date(`${eventDate}T${eventTime || "00:00"}`);
      return api.post<ChatMessage>(
        `/chat/conversations/${conversationId}/events`,
        {
          title: eventTitle.trim(),
          startsAt: startsAt.toISOString(),
          locationLabel: eventPlace.trim() || undefined,
        },
      );
    },
    onSuccess: (message) => {
      afterSend(message);
      resetComposer();
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Could not create event.");
    },
  });

  function handleFiles(selected: FileList | null) {
    if (!selected?.length) {
      return;
    }
    clearVoiceDraft();
    const next = Array.from(selected).slice(0, MAX_CHAT_IMAGES);
    setFiles(next);
    setPreviews(next.map((file) => URL.createObjectURL(file)));
    setError(null);
  }

  function pickLocation() {
    if (!navigator.geolocation) {
      setError("Location is not available in this browser.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearVoiceDraft();
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setMode("location");
        setLocating(false);
      },
      () => {
        setError("Could not get your location.");
        setLocating(false);
      },
    );
  }

  async function startRecording() {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices) {
      setError("Voice notes are not supported in this browser.");
      return;
    }

    const mimeType = pickRecorderMimeType();
    if (!mimeType) {
      setError("This browser cannot record audio.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const elapsed = Math.min(
          MAX_CHAT_AUDIO_SECONDS,
          Math.max(
            1,
            Math.round((Date.now() - recordingStartedAtRef.current) / 1000),
          ),
        );
        const blobType = recorder.mimeType || mimeType;
        const blob = new Blob(chunksRef.current, { type: blobType });
        stopRecordingTracks();
        clearRecordingTimer();
        setRecording(false);
        setRecordingSeconds(0);

        if (blob.size === 0) {
          setError("Recording was empty. Try again.");
          return;
        }

        const extension = audioExtensionForMime(blobType);
        const file = new File([blob], `voice-note.${extension}`, {
          type: normalizeRecorderType(blobType),
        });
        clearVoiceDraft();
        setFiles([]);
        setPreviews([]);
        setLocation(null);
        setMode("none");
        const url = URL.createObjectURL(blob);
        voiceDraftUrlRef.current = url;
        setVoiceDraft({
          file,
          url,
          duration: elapsed,
        });
        setError(null);
      };

      recordingStartedAtRef.current = Date.now();
      setRecordingSeconds(0);
      setRecording(true);
      setError(null);
      recorder.start();
      clearRecordingTimer();
      recordingTimerRef.current = setInterval(() => {
        const elapsed = Math.round(
          (Date.now() - recordingStartedAtRef.current) / 1000,
        );
        setRecordingSeconds(elapsed);
        if (elapsed >= MAX_CHAT_AUDIO_SECONDS) {
          stopRecording();
        }
      }, 250);
    } catch {
      stopRecordingTracks();
      setRecording(false);
      setError("Microphone access was denied.");
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      stopRecordingTracks();
      clearRecordingTimer();
      setRecording(false);
      return;
    }
    recorder.stop();
  }

  function cancelRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    stopRecordingTracks();
    clearRecordingTimer();
    chunksRef.current = [];
    setRecording(false);
    setRecordingSeconds(0);
  }

  const canSend =
    Boolean(voiceDraft) ||
    text.trim().length > 0 ||
    files.length > 0 ||
    location !== null;
  const pollValid =
    pollQuestion.trim().length > 0 &&
    pollOptions.map((option) => option.value.trim()).filter(Boolean).length >=
      2;
  const eventValid = eventTitle.trim().length > 0 && eventDate.length > 0;

  return (
    <div className={styles.root}>
      {replyTo ? (
        <div className={styles.replyBar}>
          <div className={styles.replyInfo}>
            <span className={styles.replyName}>
              Replying to {replyTo.sender.name}
            </span>
            <span className={styles.replyText}>
              {replyTo.text ?? "Attachment"}
            </span>
          </div>
          <ChatTooltip label="Cancel reply">
            <button
              type="button"
              className={styles.iconButton}
              aria-label="Cancel reply"
              onClick={onCancelReply}
            >
              <Icon name="x" />
            </button>
          </ChatTooltip>
        </div>
      ) : null}

      {previews.length > 0 ? (
        <div className={styles.previews}>
          {previews.map((src, index) => (
            <div key={src} className={styles.previewWrap}>
              <img src={src} alt="" className={styles.preview} />
              <ChatTooltip label="Remove photo">
                <button
                  type="button"
                  className={styles.previewRemove}
                  aria-label="Remove photo"
                  onClick={() => {
                    setFiles((current) =>
                      current.filter((_, i) => i !== index),
                    );
                    setPreviews((current) =>
                      current.filter((_, i) => i !== index),
                    );
                  }}
                >
                  <Icon name="x" />
                </button>
              </ChatTooltip>
            </div>
          ))}
        </div>
      ) : null}

      {voiceDraft ? (
        <div className={styles.voiceDraft}>
          <VoiceNotePlayer
            src={voiceDraft.url}
            duration={voiceDraft.duration}
            className={styles.voicePreview}
          />
          <ChatTooltip label="Discard voice note">
            <button
              type="button"
              className={styles.iconButton}
              aria-label="Discard voice note"
              onClick={() => clearVoiceDraft()}
            >
              <Icon name="x" />
            </button>
          </ChatTooltip>
        </div>
      ) : null}

      {recording ? (
        <div className={styles.recordingBar}>
          <span className={styles.recordingDot} aria-hidden />
          <span className={styles.voiceDuration}>
            Recording {formatAudioDuration(recordingSeconds)}
          </span>
          <div className={styles.formSpacer} />
          <Button size="sm" variant="quiet" onClick={cancelRecording}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" onClick={stopRecording}>
            Done
          </Button>
        </div>
      ) : null}

      {mode === "poll" ? (
        <div className={styles.attachmentForm}>
          <input
            className={styles.formInput}
            placeholder="Poll question"
            value={pollQuestion}
            onChange={(event) => setPollQuestion(event.target.value)}
          />
          {pollOptions.map((option, index) => (
            <input
              key={option.id}
              className={styles.formInput}
              placeholder={`Option ${index + 1}`}
              value={option.value}
              onChange={(event) =>
                setPollOptions((current) =>
                  current.map((existing, i) =>
                    i === index
                      ? { ...existing, value: event.target.value }
                      : existing,
                  ),
                )
              }
            />
          ))}
          <div className={styles.formRow}>
            {pollOptions.length < 10 ? (
              <Button
                size="sm"
                variant="quiet"
                onClick={() =>
                  setPollOptions((current) => [
                    ...current,
                    { id: crypto.randomUUID(), value: "" },
                  ])
                }
              >
                <Icon name="plus" />
                Add option
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="quiet"
              onClick={() => setPollMulti((value) => !value)}
            >
              {pollMulti ? "Multiple answers" : "Single answer"}
            </Button>
            <div className={styles.formSpacer} />
            <Button size="sm" variant="quiet" onClick={() => setMode("none")}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              isDisabled={!pollValid}
              isPending={pollMutation.isPending}
              onClick={() => pollMutation.mutate()}
            >
              Create poll
            </Button>
          </div>
        </div>
      ) : null}

      {mode === "event" ? (
        <div className={styles.attachmentForm}>
          <input
            className={styles.formInput}
            placeholder="Event title"
            value={eventTitle}
            onChange={(event) => setEventTitle(event.target.value)}
          />
          <div className={styles.formRow}>
            <input
              className={styles.formInput}
              type="date"
              value={eventDate}
              onChange={(event) => setEventDate(event.target.value)}
            />
            <input
              className={styles.formInput}
              type="time"
              value={eventTime}
              onChange={(event) => setEventTime(event.target.value)}
            />
          </div>
          <input
            className={styles.formInput}
            placeholder="Place (optional)"
            value={eventPlace}
            onChange={(event) => setEventPlace(event.target.value)}
          />
          <div className={styles.formRow}>
            <div className={styles.formSpacer} />
            <Button size="sm" variant="quiet" onClick={() => setMode("none")}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              isDisabled={!eventValid}
              isPending={eventMutation.isPending}
              onClick={() => eventMutation.mutate()}
            >
              Create event
            </Button>
          </div>
        </div>
      ) : null}

      {mode === "location" && location ? (
        <div className={styles.attachmentForm}>
          <Text slot="description">
            📍 {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
          </Text>
          <input
            className={styles.formInput}
            placeholder="Label (optional)"
            value={locationLabel}
            onChange={(event) => setLocationLabel(event.target.value)}
          />
          <div className={styles.formRow}>
            <div className={styles.formSpacer} />
            <Button
              size="sm"
              variant="quiet"
              onClick={() => {
                setLocation(null);
                setMode("none");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <div className={styles.inputRow}>
        <TooltipIconBar
          placement="top"
          className={styles.iconBar ?? ""}
          portal
          disabled={isMobile}
        >
          <TooltipIconBarItem label="Add photos">
            <FileTrigger
              accept="image/jpeg,image/png,image/webp,image/gif"
              allowsMultiple
              onSelect={handleFiles}
            >
              <Button
                variant="quiet"
                size="sm"
                isIconOnly
                className={styles.tool}
                aria-label="Add photos"
                aria-pressed={files.length > 0}
                data-selected={files.length > 0 ? "true" : undefined}
                isDisabled={recording || Boolean(voiceDraft)}
              >
                <Icon name="image" />
              </Button>
            </FileTrigger>
          </TooltipIconBarItem>

          <TooltipIconBarItem
            label={recording ? "Stop recording" : "Record voice note"}
          >
            <Button
              variant="quiet"
              size="sm"
              isIconOnly
              className={styles.tool}
              aria-label={recording ? "Stop recording" : "Record voice note"}
              aria-pressed={recording}
              data-selected={recording ? "true" : undefined}
              data-recording={recording ? "true" : undefined}
              isDisabled={Boolean(voiceDraft) && !recording}
              onClick={() => {
                if (recording) {
                  stopRecording();
                  return;
                }
                void startRecording();
              }}
            >
              <Icon name="mic" />
            </Button>
          </TooltipIconBarItem>

          <TooltipIconBarItem label="Create poll">
            <Button
              variant="quiet"
              size="sm"
              isIconOnly
              className={styles.tool}
              aria-label="Create poll"
              aria-pressed={mode === "poll"}
              data-selected={mode === "poll" ? "true" : undefined}
              isDisabled={recording || Boolean(voiceDraft)}
              onClick={() => setMode(mode === "poll" ? "none" : "poll")}
            >
              <Icon name="chart-bar" />
            </Button>
          </TooltipIconBarItem>

          <TooltipIconBarItem label="Create event">
            <Button
              variant="quiet"
              size="sm"
              isIconOnly
              className={styles.tool}
              aria-label="Create event"
              aria-pressed={mode === "event"}
              data-selected={mode === "event" ? "true" : undefined}
              isDisabled={recording || Boolean(voiceDraft)}
              onClick={() => setMode(mode === "event" ? "none" : "event")}
            >
              <Icon name="calendar" />
            </Button>
          </TooltipIconBarItem>

          <TooltipIconBarItem label="Share location">
            <Button
              variant="quiet"
              size="sm"
              isIconOnly
              className={styles.tool}
              aria-label="Share location"
              aria-pressed={mode === "location" || locating}
              data-selected={
                mode === "location" || locating ? "true" : undefined
              }
              isPending={locating}
              isDisabled={recording || Boolean(voiceDraft)}
              onClick={pickLocation}
            >
              <Icon name="map-pin" />
            </Button>
          </TooltipIconBarItem>
        </TooltipIconBar>

        <textarea
          ref={textAreaRef}
          className={styles.textInput}
          rows={1}
          placeholder={
            !online
              ? "Message (will send when online)…"
              : voiceDraft
                ? "Voice note ready"
                : "Message…"
          }
          value={text}
          disabled={recording || Boolean(voiceDraft)}
          aria-label="Message"
          onChange={(event) => {
            setText(event.target.value);
            signalTyping();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (canSend) {
                sendNow();
              }
            }
          }}
        />

        <TooltipIconBar
          placement="top"
          className={styles.sendBar ?? ""}
          portal
          disabled={isMobile}
        >
          <TooltipIconBarItem label={online ? "Send" : "Queue send"}>
            <Button
              variant="primary"
              size="sm"
              isIconOnly
              aria-label={online ? "Send" : "Queue send"}
              isDisabled={!canSend || recording}
              preventFocusOnPress
              onClick={sendNow}
            >
              <Icon name="send" />
            </Button>
          </TooltipIconBarItem>
        </TooltipIconBar>
      </div>

      {!online ? (
        <Text className={styles.error}>
          You’re offline. Messages will send automatically when you’re back
          online.
        </Text>
      ) : null}

      {error ? <Text className={styles.error}>{error}</Text> : null}
    </div>
  );
}

function normalizeRecorderType(mimeType: string) {
  return mimeType.trim().toLowerCase().split(";")[0]?.trim() || "audio/webm";
}
