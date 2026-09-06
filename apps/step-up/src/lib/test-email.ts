/** Inbox for local, e2e, and smoke users. Plus-tag is the old @stepup.dev local part. */
export function testEmail(username: string): string {
  const tag = username
    .trim()
    .toLowerCase()
    .replace(/@.*$/, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  if (!tag) {
    throw new Error("testEmail requires a username");
  }
  return `soundhar.adi+${tag}@gmail.com`;
}
