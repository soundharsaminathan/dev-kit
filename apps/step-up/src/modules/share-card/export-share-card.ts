import { renderShareCard } from "./render-share-card";
import type { BatchShareCardData, ShareCardLayoutId } from "./types";

export type ShareCardExportResult =
  | { mode: "shared" }
  | { mode: "downloaded" }
  | { mode: "copied" }
  | { mode: "cancelled" };

function slugifyFilename(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "batch"
  );
}

export async function canvasToPngFile(
  canvas: HTMLCanvasElement,
  filename: string,
): Promise<File> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
  if (!blob) {
    throw new Error("Could not generate the share image.");
  }
  return new File([blob], filename, { type: "image/png" });
}

export function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function canShareFiles(file: File): boolean {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.share !== "function"
  ) {
    return false;
  }
  if (typeof navigator.canShare !== "function") {
    return false;
  }
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

export async function copyImageToClipboard(blob: Blob): Promise<boolean> {
  if (
    typeof navigator === "undefined" ||
    !navigator.clipboard ||
    typeof ClipboardItem === "undefined"
  ) {
    return false;
  }
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type || "image/png"]: blob }),
    ]);
    return true;
  } catch {
    return false;
  }
}

export async function generateShareCardFile(input: {
  data: BatchShareCardData;
  layout: ShareCardLayoutId;
  canvas?: HTMLCanvasElement;
}): Promise<File> {
  const canvas = await renderShareCard({
    data: input.data,
    layout: input.layout,
    ...(input.canvas ? { canvas: input.canvas } : {}),
  });
  const filename = `${slugifyFilename(input.data.batchName)}-story.png`;
  return canvasToPngFile(canvas, filename);
}

export async function shareOrDownloadShareCard(input: {
  data: BatchShareCardData;
  layout: ShareCardLayoutId;
  canvas?: HTMLCanvasElement;
  preferDownload?: boolean;
}): Promise<ShareCardExportResult> {
  const file = await generateShareCardFile(input);

  if (!input.preferDownload && canShareFiles(file)) {
    try {
      await navigator.share({
        files: [file],
        title: input.data.batchName,
        text: `${input.data.headline} — ${input.data.batchName}`,
      });
      return { mode: "shared" };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return { mode: "cancelled" };
      }
      // Fall through to download.
    }
  }

  downloadFile(file);
  return { mode: "downloaded" };
}

export async function downloadShareCard(input: {
  data: BatchShareCardData;
  layout: ShareCardLayoutId;
  canvas?: HTMLCanvasElement;
}): Promise<ShareCardExportResult> {
  return shareOrDownloadShareCard({ ...input, preferDownload: true });
}
