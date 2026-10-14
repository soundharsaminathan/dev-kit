import { useCallback, useContext } from "react";
import { AuthContext } from "@/lib/auth-context";
import { ActiveStudentContext } from "@/modules/me/active-student-context";
import type { MarketplaceFetchAuth } from "./types";

export function useMarketplaceAuth() {
  const auth = useContext(AuthContext);
  const active = useContext(ActiveStudentContext);
  const user = auth?.user ?? null;
  const studentId =
    user && active?.studentId && active.studentId !== user.id
      ? active.studentId
      : undefined;

  const resolveAuth = useCallback(async (): Promise<MarketplaceFetchAuth> => {
    const token = auth?.getIdToken ? await auth.getIdToken() : null;
    return studentId ? { token, studentId } : { token };
  }, [auth, studentId]);

  return {
    user,
    studentId,
    viewerKey: `${user?.id ?? "guest"}:${studentId ?? "self"}`,
    resolveAuth,
  };
}
