import { type ReactNode, useContext, useMemo, useRef } from "react";
import { createApiClient } from "@/lib/api";
import { ApiContext } from "@/lib/api-client-context";
import { AuthContext } from "@/lib/auth-context";

export function ApiProvider({ children }: { children: ReactNode }) {
  const auth = useContext(AuthContext);
  const authRef = useRef(auth);
  authRef.current = auth;

  const client = useMemo(
    () =>
      createApiClient(
        async () => {
          if (!authRef.current) {
            return null;
          }
          return authRef.current.getIdToken();
        },
        {
          onUnauthorized: () => {
            const current = authRef.current;
            if (!current?.user) {
              return;
            }
            // Account removed (e.g. studio deleted) — drop the stale session.
            void current.signOutUser();
          },
        },
      ),
    [],
  );

  return <ApiContext.Provider value={client}>{children}</ApiContext.Provider>;
}
