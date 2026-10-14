function isTransientDbError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Can't reach database server") ||
    message.includes("P1001") ||
    message.includes("P1002") ||
    message.includes("P1017") ||
    message.includes("ECONNRESET") ||
    message.includes("ETIMEDOUT") ||
    message.includes("ECONNREFUSED") ||
    message.includes("Connection terminated") ||
    message.includes("server closed the connection")
  );
}

export async function withDbRetry<T>(
  label: string,
  fn: () => Promise<T>,
  opts?: { attempts?: number; baseDelayMs?: number },
): Promise<T> {
  const attempts = opts?.attempts ?? 5;
  const baseDelayMs = opts?.baseDelayMs ?? 2_000;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransientDbError(error) || attempt === attempts) {
        throw error;
      }
      const delayMs = baseDelayMs * attempt;
      console.warn(
        `${label}: transient DB error (attempt ${attempt}/${attempts}), retrying in ${delayMs}ms…`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

export function importFailureMessage(error: unknown): string {
  if (isTransientDbError(error)) {
    return "Could not reach the database. Wait a moment and try the import again.";
  }
  return error instanceof Error ? error.message : "Import failed";
}

export function withDatabaseConnectTimeout(
  url: string | undefined,
  seconds: number,
): string | undefined {
  if (!url) {
    return url;
  }
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("connect_timeout")) {
      parsed.searchParams.set("connect_timeout", String(seconds));
    }
    return parsed.toString();
  } catch {
    return url;
  }
}
