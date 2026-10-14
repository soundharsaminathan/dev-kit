import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode, useLayoutEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider, useAuth } from "@/lib/auth";
import { queryClient } from "@/lib/query";
import "@dev-ui/tokens/fonts/critical";
import "@/styles/global.scss";
import { routeTree } from "./routeTree.gen";

const router = createRouter({
  routeTree,
  context: {
    auth: undefined!,
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function AppRouter() {
  const auth = useAuth();
  const sessionKey = auth.user ? `${auth.user.id}:${auth.user.role}` : "";
  const sessionKeyRef = useRef(sessionKey);

  // beforeLoad only runs on navigation. Re-run it when the session changes
  // so sign-out leaves the protected page immediately.
  useLayoutEffect(() => {
    if (sessionKeyRef.current === sessionKey) return;
    sessionKeyRef.current = sessionKey;
    queryClient.clear();
    void router.invalidate();
  }, [sessionKey]);

  return <RouterProvider router={router} context={{ auth }} />;
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root not found");
}

createRoot(rootEl).render(
  <StrictMode>
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  </StrictMode>,
);
