import type { ApiClient } from "@/lib/api";
import type { SignedUploadResponse } from "@/modules/social/types";
import { uploadSocialPhoto } from "@/modules/social/upload";

export const MAX_CHAT_IMAGES = 10;
export const MAX_CHAT_AUDIO_BYTES = 10 * 1024 * 1024;
export const MAX_CHAT_AUDIO_SECONDS = 600;

const ALLOWED_CHAT_AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/x-m4a",
  "audio/aac",
]);

function normalizeContentType(contentType: string) {
  return contentType.trim().toLowerCase().split(";")[0]?.trim() ?? "";
}

export function validateChatAudio(file: File) {
  const type = normalizeContentType(file.type);
  if (!ALLOWED_CHAT_AUDIO_TYPES.has(type)) {
    throw new Error(
      "Voice notes must be WebM, MP4, MPEG, OGG, WAV, M4A, or AAC audio.",
    );
  }
  if (file.size > MAX_CHAT_AUDIO_BYTES) {
    throw new Error("Voice notes must be 10 MB or smaller.");
  }
}

export async function uploadChatPhotos(api: ApiClient, files: File[]) {
  if (files.length === 0) {
    throw new Error("Choose at least one photo.");
  }
  if (files.length > MAX_CHAT_IMAGES) {
    throw new Error(`You can send at most ${MAX_CHAT_IMAGES} photos at once.`);
  }

  const urls: string[] = [];
  for (const file of files) {
    urls.push(await uploadSocialPhoto(api, file, "chat"));
  }
  return urls;
}

export async function uploadChatAudio(api: ApiClient, file: File) {
  validateChatAudio(file);
  const contentType = normalizeContentType(file.type);

  const signed = await api.post<SignedUploadResponse>("/media/signed-url", {
    filename: file.name,
    contentType,
    purpose: "chat",
  });

  const response = await fetch(signed.uploadUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": signed.contentType,
      ...signed.headers,
    },
  });

  if (!response.ok) {
    throw new Error("The voice note could not be uploaded. Try again.");
  }

  return signed.publicUrl;
}

export function pickRecorderMimeType() {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

export function audioExtensionForMime(mimeType: string) {
  const type = normalizeContentType(mimeType);
  if (type.includes("mp4") || type.includes("m4a") || type.includes("aac")) {
    return "m4a";
  }
  if (type.includes("ogg")) {
    return "ogg";
  }
  if (type.includes("mpeg") || type.includes("mp3")) {
    return "mp3";
  }
  if (type.includes("wav")) {
    return "wav";
  }
  return "webm";
}

export function formatAudioDuration(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
