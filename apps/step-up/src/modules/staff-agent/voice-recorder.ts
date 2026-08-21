import {
  audioExtensionForMime,
  pickRecorderMimeType,
} from "@/modules/chat/upload";

const MAX_AGENT_AUDIO_SECONDS = 30;

export type VoiceRecording = {
  blob: Blob;
  mimeType: string;
  durationSec: number;
};

export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function createVoiceRecorder(options: {
  onTick: (seconds: number) => void;
  onError: (message: string) => void;
}) {
  let mediaRecorder: MediaRecorder | null = null;
  let mediaStream: MediaStream | null = null;
  let chunks: Blob[] = [];
  let startedAt = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  let resolveStop: ((value: VoiceRecording | null) => void) | null = null;

  function clearTimer() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function stopTracks() {
    for (const track of mediaStream?.getTracks() ?? []) {
      track.stop();
    }
    mediaStream = null;
  }

  async function start(): Promise<void> {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices) {
      options.onError("Voice recording is not supported in this browser.");
      return;
    }
    const mimeType = pickRecorderMimeType();
    if (!mimeType) {
      options.onError("This browser cannot record audio.");
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStream = stream;
    chunks = [];
    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorder = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.onstop = () => {
      clearTimer();
      const elapsed = Math.min(
        MAX_AGENT_AUDIO_SECONDS,
        Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
      );
      const blobType = recorder.mimeType || mimeType;
      const blob = new Blob(chunks, { type: blobType });
      stopTracks();
      mediaRecorder = null;
      const result =
        blob.size > 0
          ? {
              blob,
              mimeType: blobType.split(";")[0]?.trim() || blobType,
              durationSec: elapsed,
            }
          : null;
      resolveStop?.(result);
      resolveStop = null;
    };

    startedAt = Date.now();
    options.onTick(0);
    recorder.start();
    clearTimer();
    timer = setInterval(() => {
      const elapsed = Math.round((Date.now() - startedAt) / 1000);
      options.onTick(elapsed);
      if (elapsed >= MAX_AGENT_AUDIO_SECONDS) {
        void stop();
      }
    }, 250);
  }

  function stop(): Promise<VoiceRecording | null> {
    return new Promise((resolve) => {
      if (!mediaRecorder || mediaRecorder.state === "inactive") {
        clearTimer();
        stopTracks();
        resolve(null);
        return;
      }
      resolveStop = resolve;
      mediaRecorder.stop();
    });
  }

  function cancel() {
    clearTimer();
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.onstop = null;
      mediaRecorder.stop();
    }
    mediaRecorder = null;
    chunks = [];
    stopTracks();
    resolveStop?.(null);
    resolveStop = null;
  }

  return { start, stop, cancel };
}

export function fileNameForMime(mimeType: string) {
  return `staff-agent.${audioExtensionForMime(mimeType)}`;
}

export { MAX_AGENT_AUDIO_SECONDS };
