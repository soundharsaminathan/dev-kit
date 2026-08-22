const ENTITY_PATTERN = /&(?:#x?[0-9a-f]+|\w+);/i;

function decodeImportTextOnce(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    );
}

/** Decode XML/HTML entities from import sources (inline XLSX, exporters). */
export function decodeImportText(value: string): string {
  if (!ENTITY_PATTERN.test(value)) {
    return value;
  }

  let decoded = value;
  for (let pass = 0; pass < 3 && ENTITY_PATTERN.test(decoded); pass += 1) {
    const next = decodeImportTextOnce(decoded);
    if (next === decoded) {
      break;
    }
    decoded = next;
  }
  return decoded;
}

export function sanitizeImportValue(value: unknown): unknown {
  if (typeof value === "string") {
    return decodeImportText(value);
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeImportValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        sanitizeImportValue(entry),
      ]),
    );
  }
  return value;
}
