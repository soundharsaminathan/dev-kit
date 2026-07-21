import { createContext, type ReactNode, useContext, useMemo } from "react";
import { type ApiClient, createApiClient } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const ApiContext = createContext<ApiClient | null>(null);

export function ApiProvider({ children }: { children: ReactNode }) {
  const { getIdToken } = useAuth();
  const client = useMemo(() => createApiClient(getIdToken), [getIdToken]);

  return <ApiContext.Provider value={client}>{children}</ApiContext.Provider>;
}

export function useApi() {
  const client = useContext(ApiContext);
  if (!client) {
    throw new Error("useApi must be used within ApiProvider");
  }
  return client;
}
