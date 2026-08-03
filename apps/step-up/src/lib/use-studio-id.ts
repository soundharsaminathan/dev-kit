import { useAuth } from "@/lib/auth";

export function useOptionalStudioId(): string | null {
  const { user } = useAuth();
  return user?.studioId ?? null;
}

export function useStudioId(): string {
  const studioId = useOptionalStudioId();
  if (!studioId) {
    throw new Error("No studio on account");
  }
  return studioId;
}
