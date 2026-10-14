import { useParams, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";

const STORAGE_KEY = "classa:admin-studio-id";

export type AdminStudioDestination =
  | { to: "/admin/studios/$id"; params: { id: string } }
  | { to: "/admin/studios/$id/features"; params: { id: string } }
  | { to: "/admin/studios/$id/invoices"; params: { id: string } };

function readStoredStudioId(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

function writeStoredStudioId(studioId: string) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, studioId);
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function rememberAdminStudioId(studioId: string) {
  writeStoredStudioId(studioId);
}

function isAdminStudioPage(pathname: string, suffix: string) {
  return new RegExp(`^/admin/studios/[^/]+/${suffix}/?$`).test(pathname);
}

function isAdminStudioEdit(pathname: string) {
  return (
    /^\/admin\/studios\/[^/]+\/?$/.test(pathname) &&
    !pathname.endsWith("/new") &&
    pathname !== "/admin/studios/new"
  );
}

/** Map current admin path to the same page type for a different studio. */
export function adminStudioDestination(
  pathname: string,
  studioId: string,
): AdminStudioDestination {
  if (isAdminStudioPage(pathname, "features")) {
    return {
      to: "/admin/studios/$id/features",
      params: { id: studioId },
    };
  }
  if (isAdminStudioPage(pathname, "invoices")) {
    return {
      to: "/admin/studios/$id/invoices",
      params: { id: studioId },
    };
  }
  if (isAdminStudioEdit(pathname)) {
    return {
      to: "/admin/studios/$id",
      params: { id: studioId },
    };
  }
  return {
    to: "/admin/studios/$id",
    params: { id: studioId },
  };
}

export function useAdminStudioId(): string | null {
  const params = useParams({ strict: false }) as { id?: string };
  const routeId = params.id ?? null;
  const storedId = readStoredStudioId();

  useEffect(() => {
    if (routeId) {
      writeStoredStudioId(routeId);
    }
  }, [routeId]);

  return routeId ?? storedId;
}

export function useAdminStudioDestination(studioId: string) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  return adminStudioDestination(pathname, studioId);
}
