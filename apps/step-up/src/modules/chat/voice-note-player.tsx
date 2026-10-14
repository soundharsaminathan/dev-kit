import { type CSSProperties, useEffect, useId, useRef, useState } from "react";
import { formatAudioDuration } from "./upload";
import styles from "./voice-note-player.module.scss";

type VoiceNotePlayerProps = {
  src: string | null;
  duration: number | null;
  className?: string | undefined;
};

export function VoiceNotePlayer({
  src,
  duration,
  className,
}: VoiceNotePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressId = useId();
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [knownDuration, setKnownDuration] = useState(duration ?? 0);
  const [failed, setFailed] = useState(!src);

  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setKnownDuration(duration ?? 0);
    setFailed(!src);
  }, [src, duration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!src || !audio) {
      return;
    }

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setKnownDuration(audio.duration);
      }
    };
    const onEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onError = () => {
      setFailed(true);
      setPlaying(false);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("loadedmetadata", onDurationChange);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("loadedmetadata", onDurationChange);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("error", onError);
    };
  }, [src]);

  const total = knownDuration > 0 ? knownDuration : (duration ?? 0);
  const progress = total > 0 ? Math.min(1, currentTime / total) : 0;
  const displayTime = playing || currentTime > 0 ? currentTime : total;

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || failed || !src) {
      return;
    }
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setFailed(true);
      }
      return;
    }
    audio.pause();
  }

  function seek(next: number) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(next)) {
      return;
    }
    audio.currentTime = next;
    setCurrentTime(next);
  }

  const rootClass = [styles.root, className].filter(Boolean).join(" ");

  return (
    <div className={rootClass} data-failed={failed || undefined}>
      {src ? (
        // biome-ignore lint/a11y/useMediaCaption: voice notes are non-dialogue audio
        <audio ref={audioRef} src={src} preload="metadata" />
      ) : null}

      <button
        type="button"
        className={styles.playButton}
        aria-label={playing ? "Pause voice note" : "Play voice note"}
        disabled={failed || !src}
        onClick={() => void togglePlayback()}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>

      <div className={styles.track}>
        <label className={styles.visuallyHidden} htmlFor={progressId}>
          Voice note position
        </label>
        <input
          id={progressId}
          className={styles.scrubber}
          type="range"
          min={0}
          max={total > 0 ? total : 1}
          step={0.01}
          value={Math.min(currentTime, total > 0 ? total : 1)}
          disabled={failed || !src || total <= 0}
          aria-valuetext={formatAudioDuration(currentTime)}
          onChange={(event) => seek(Number(event.currentTarget.value))}
          style={{ "--progress": `${progress * 100}%` } as CSSProperties}
        />
        <span className={styles.duration} aria-hidden={failed || undefined}>
          {failed ? "Unavailable" : formatAudioDuration(displayTime)}
        </span>
      </div>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      aria-hidden
      focusable="false"
    >
      <title>Play</title>
      <path fill="currentColor" d="M8 5.14v13.72L19 12 8 5.14z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      aria-hidden
      focusable="false"
    >
      <title>Pause</title>
      <path fill="currentColor" d="M6 5h4v14H6zm8 0h4v14h-4z" />
    </svg>
  );
}
