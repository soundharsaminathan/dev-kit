import type { ApiClient } from "@/lib/api";
import type { BranchMediaKind, SignedUploadResponse } from "./types";

export const MAX_BRANCH_IMAGES = 24;
export const MAX_BRANCH_VIDEOS = 6;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 40 * 1024 * 1024;

const ALLOWED_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm"]);

export function mediaKindFromFile(file: File): BranchMediaKind {
  if (ALLOWED_VIDEO_TYPES.has(file.type)) {
    return "VIDEO";
  }
  return "IMAGE";
}

export function validateBranchMedia(file: File) {
  const kind = mediaKindFromFile(file);

  if (kind === "IMAGE") {
    if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
      throw new Error("Only JPEG, PNG, WebP, and GIF images are supported.");
    }
    if (file.size > MAX_PHOTO_BYTES) {
      throw new Error("Each photo must be 5 MB or smaller.");
    }
    return kind;
  }

  if (!ALLOWED_VIDEO_TYPES.has(file.type)) {
    throw new Error("Only MP4 and WebM videos are supported.");
  }
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error("Each video must be 40 MB or smaller.");
  }
  return kind;
}

export async function uploadBranchMedia(api: ApiClient, file: File) {
  const kind = validateBranchMedia(file);

  const signed = await api.post<SignedUploadResponse>("/media/signed-url", {
    filename: file.name,
    contentType: file.type,
    purpose: "branch",
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
    throw new Error("The file could not be uploaded. Try again.");
  }

  return {
    objectKey: signed.publicUrl,
    kind,
  };
}

export async function uploadBranchMediaFiles(
  api: ApiClient,
  files: FileList | File[],
  counts: { images: number; videos: number },
) {
  const selected = Array.from(files);
  let images = counts.images;
  let videos = counts.videos;
  const uploaded: Array<{ objectKey: string; kind: BranchMediaKind }> = [];

  for (const file of selected) {
    const kind = validateBranchMedia(file);
    if (kind === "IMAGE") {
      images += 1;
      if (images > MAX_BRANCH_IMAGES) {
        throw new Error(
          `A branch can have at most ${MAX_BRANCH_IMAGES} active images.`,
        );
      }
    } else {
      videos += 1;
      if (videos > MAX_BRANCH_VIDEOS) {
        throw new Error(
          `A branch can have at most ${MAX_BRANCH_VIDEOS} active videos.`,
        );
      }
    }
    uploaded.push(await uploadBranchMedia(api, file));
  }

  return uploaded;
}

/** @deprecated Use uploadBranchMediaFiles */
export const MAX_BRANCH_PHOTOS = MAX_BRANCH_IMAGES;

/** @deprecated Use uploadBranchMedia */
export async function uploadBranchPhoto(api: ApiClient, file: File) {
  const result = await uploadBranchMedia(api, file);
  return result.objectKey;
}

/** @deprecated Use uploadBranchMediaFiles */
export async function uploadBranchPhotos(
  api: ApiClient,
  files: FileList | File[],
  currentCount: number,
) {
  const uploaded = await uploadBranchMediaFiles(api, files, {
    images: currentCount,
    videos: 0,
  });
  return uploaded.map((item) => item.objectKey);
}
