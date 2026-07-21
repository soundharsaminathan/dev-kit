import type { ApiClient } from "@/lib/api";
import type { SignedUploadResponse } from "./types";

export const MAX_POST_IMAGES = 10;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const ALLOWED_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function validateSocialPhoto(file: File) {
  if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
    throw new Error("Only JPEG, PNG, WebP, and GIF images are supported.");
  }

  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error("Each photo must be 5 MB or smaller.");
  }
}

export async function uploadSocialPhoto(
  api: ApiClient,
  file: File,
  purpose: "avatar" | "post" | "chat",
) {
  validateSocialPhoto(file);

  const signed = await api.post<SignedUploadResponse>("/media/signed-url", {
    filename: file.name,
    contentType: file.type,
    purpose,
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
    throw new Error("The photo could not be uploaded. Try again.");
  }

  return signed.publicUrl;
}

export async function uploadPostPhotos(
  api: ApiClient,
  files: FileList | File[],
) {
  const selected = Array.from(files);
  if (selected.length === 0) {
    throw new Error("Choose at least one photo.");
  }
  if (selected.length > MAX_POST_IMAGES) {
    throw new Error(`A post can have at most ${MAX_POST_IMAGES} photos.`);
  }

  const urls: string[] = [];
  for (const file of selected) {
    urls.push(await uploadSocialPhoto(api, file, "post"));
  }
  return urls;
}

export async function sharePost(postId: string) {
  const url = `${window.location.origin}/posts/${postId}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: "Step Up post", url });
      return;
    } catch {
      // fall through to clipboard
    }
  }
  await navigator.clipboard.writeText(url);
}
