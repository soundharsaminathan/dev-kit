import type { ApiClient } from "@/lib/api";

export const MAX_CERT_ASSET_BYTES = 5 * 1024 * 1024;

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

type SignedUploadResponse = {
  uploadUrl: string;
  publicUrl: string;
  contentType: string;
  headers?: Record<string, string>;
};

export function validateCertificateAsset(file: File) {
  if (!ALLOWED.has(file.type)) {
    throw new Error("Only JPEG, PNG, WebP, and GIF images are supported.");
  }
  if (file.size > MAX_CERT_ASSET_BYTES) {
    throw new Error("Each image must be 5 MB or smaller.");
  }
}

export async function uploadCertificateAsset(api: ApiClient, file: File) {
  validateCertificateAsset(file);

  const signed = await api.post<SignedUploadResponse>("/media/signed-url", {
    filename: file.name,
    contentType: file.type,
    purpose: "certificate",
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
    throw new Error("The image could not be uploaded. Try again.");
  }

  return signed.publicUrl;
}
