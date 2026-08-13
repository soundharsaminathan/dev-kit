import { useAuth } from "@/lib/auth";

export function useOptionalStudioId(): string | null {
  const { user } = useAuth();
  return user?.studioId ?? null;
}

export function useStudioId(): string {
  const { user } = useAuth();
  const studioId = user?.studioId ?? null;
  if (!user) {
    return "";
  }
  if (!studioId) {
    throw new Error("No studio on account");
  }
  return studioId;
}
