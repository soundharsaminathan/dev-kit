import { Loader } from "@dev-ui/components/loader";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "@dev-ui/tokens/fonts";
import "@dev-ui/tokens/scss";
import "@dev-ui/components/styles";
import "@/styles/global.scss";
import { AuthProvider, useAuth } from "@/lib/auth";
import { initSentry } from "@/lib/sentry";
import { routeTree } from "./routeTree.gen";

initSentry();

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
  const [ready, setReady] = useState(!auth.loading);
  const userId = auth.user?.id;
  const invalidatedFor = useRef<{ userId: string | undefined } | null>(null);

  useEffect(() => {
    if (!auth.loading) {
      setReady(true);
    }
  }, [auth.loading]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (invalidatedFor.current && invalidatedFor.current.userId === userId) {
      return;
    }
    invalidatedFor.current = { userId };
    void router.invalidate();
  }, [userId, ready]);

  if (!ready) {
    return (
      <div
        style={{ display: "grid", placeItems: "center", minHeight: "100dvh" }}
      >
        <Loader aria-label="Loading" />
      </div>
    );
  }

  return <RouterProvider router={router} context={{ auth }} />;
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  </StrictMode>,
);
