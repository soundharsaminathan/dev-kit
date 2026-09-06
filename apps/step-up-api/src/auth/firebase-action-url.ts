export function toAppEmailActionUrl(
  firebaseLink: string,
  appUrl: string,
): string {
  let parsed: URL;
  try {
    parsed = new URL(firebaseLink);
  } catch {
    return firebaseLink;
  }

  const mode = parsed.searchParams.get("mode");
  const oobCode = parsed.searchParams.get("oobCode");
  if (!mode || !oobCode) {
    return firebaseLink;
  }

  const next = new URL(`${appUrl.replace(/\/$/, "")}/auth/action`);
  next.searchParams.set("mode", mode);
  next.searchParams.set("oobCode", oobCode);
  const continueUrl = parsed.searchParams.get("continueUrl");
  if (continueUrl) {
    next.searchParams.set("continueUrl", continueUrl);
  }
  return next.toString();
}
