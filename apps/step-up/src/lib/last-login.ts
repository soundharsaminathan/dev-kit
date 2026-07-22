const LAST_LOGIN_IDENTIFIER_KEY = "step-up-last-login-identifier";

export function getLastLoginIdentifier(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(LAST_LOGIN_IDENTIFIER_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function setLastLoginIdentifier(identifier: string) {
  const trimmed = identifier.trim();
  if (!trimmed) return;
  try {
    localStorage.setItem(LAST_LOGIN_IDENTIFIER_KEY, trimmed);
  } catch {
    // Ignore quota / private-mode failures; login still works without a hint.
  }
}
