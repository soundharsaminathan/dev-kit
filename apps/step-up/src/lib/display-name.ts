/** Email local-part used as default display name / avatar letter. */
export function displayNameFromEmail(email?: string | null): string | undefined {
  const local = email?.split("@")[0]?.trim();
  return local || undefined;
}

export function resolveDisplayName(
  name?: string | null,
  email?: string | null,
): string | undefined {
  const trimmed = name?.trim();
  if (trimmed && trimmed !== "New User") {
    return trimmed;
  }
  return displayNameFromEmail(email);
}

export function avatarLetter(
  name?: string | null,
  email?: string | null,
): string {
  const resolved = resolveDisplayName(name, email);
  return resolved?.charAt(0).toUpperCase() || "?";
}
