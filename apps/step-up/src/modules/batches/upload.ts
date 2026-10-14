import type { ApiClient } from "@/lib/api";

export const MAX_BATCH_COVER_BYTES = 5 * 1024 * 1024;
export const BATCH_COVER_ASPECT = 16 / 9;

const ALLOWED_COVER_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

type SignedUploadResponse = {
  uploadUrl: string;
  publicUrl: string;
  contentType: string;
  headers?: Record<string, string>;
};

export function validateBatchCover(file: File) {
  if (!ALLOWED_COVER_TYPES.has(file.type)) {
    throw new Error("Only JPEG, PNG, WebP, and GIF images are supported.");
  }
  if (file.size > MAX_BATCH_COVER_BYTES) {
    throw new Error("Cover image must be 5 MB or smaller.");
  }
}

export async function uploadBatchCover(api: ApiClient, file: File) {
  validateBatchCover(file);

  const signed = await api.post<SignedUploadResponse>("/media/signed-url", {
    filename: file.name,
    contentType: file.type,
    purpose: "batch",
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
    throw new Error("The cover image could not be uploaded. Try again.");
  }

  return signed.publicUrl;
}
