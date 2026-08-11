import type { ApiClient } from "@/lib/api";
import type { SignedUploadResponse } from "@/modules/locations/types";

export const MAX_RECEIPT_BYTES = 8 * 1024 * 1024;

const ALLOWED_RECEIPT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

export function validateReceiptFile(file: File) {
  if (!ALLOWED_RECEIPT_TYPES.has(file.type)) {
    throw new Error(
      "Receipts must be a JPEG, PNG, WebP, GIF image, or a PDF file.",
    );
  }
  if (file.size > MAX_RECEIPT_BYTES) {
    throw new Error("Each receipt must be 8 MB or smaller.");
  }
}

export async function uploadExpenseReceipt(
  api: ApiClient,
  file: File,
): Promise<string> {
  validateReceiptFile(file);

  const signed = await api.post<SignedUploadResponse>("/media/signed-url", {
    filename: file.name,
    contentType: file.type,
    purpose: "expense-receipt",
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
    throw new Error("The receipt could not be uploaded. Try again.");
  }

  return signed.publicUrl;
}
