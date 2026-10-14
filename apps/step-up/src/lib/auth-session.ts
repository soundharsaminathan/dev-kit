import { ApiError } from "./api";

/**
 * After a cache-hydrated shell has painted, only a real 401 should drop the
 * session. Timeouts and network errors must keep the cached user — signing out
 * remounts protected routes with user=null and `useStudioId()` crashes the tree.
 */
export function shouldKeepHydratedSession(
  error: unknown,
  hasHydratedCache: boolean,
): boolean {
  if (!hasHydratedCache) {
    return false;
  }
  return !(error instanceof ApiError && error.status === 401);
}
