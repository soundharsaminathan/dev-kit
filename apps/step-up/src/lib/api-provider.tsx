import { type ReactNode, useContext, useMemo } from "react";
import { createApiClient } from "@/lib/api";
import { ApiContext } from "@/lib/api-client-context";
import { AuthContext } from "@/lib/auth-context";

export function ApiProvider({ children }: { children: ReactNode }) {
  const auth = useContext(AuthContext);
  const client = useMemo(
    () =>
      createApiClient(async () => {
        if (!auth) {
          return null;
        }
        return auth.getIdToken();
      }),
    [auth],
  );

  return <ApiContext.Provider value={client}>{children}</ApiContext.Provider>;
}
