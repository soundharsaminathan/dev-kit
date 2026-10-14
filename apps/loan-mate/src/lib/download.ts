import { getApiBaseUrl } from "./constants";

export async function downloadAuthed(
  path: string,
  token: string,
  filename: string,
) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Download failed (${response.status})`);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
