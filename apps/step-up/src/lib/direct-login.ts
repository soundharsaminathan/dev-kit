export const DIRECT_LOGIN_PATH = "/login";

export function isDirectLoginFlag(value: unknown): boolean {
  return value === true || value === "true" || value === "1";
}

export function buildDirectLoginUrl(origin: string): string {
  const url = new URL(DIRECT_LOGIN_PATH, origin);
  url.searchParams.set("direct", "1");
  return url.toString();
}
