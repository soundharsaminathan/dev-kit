import type { IconPackId, IconPackModule } from "./types";

const moduleCache = new Map<IconPackId, Promise<IconPackModule>>();

const resolvedPackCache = new Map<IconPackId, IconPackModule>();

let activePack: IconPackModule | null = null;
let activePackId: IconPackId | null = null;

export function getActivePack(): IconPackModule | null {
  return activePack;
}

export function getActivePackId(): IconPackId | null {
  return activePackId;
}

export function setActivePack(packId: IconPackId, pack: IconPackModule): void {
  activePackId = packId;
  activePack = pack;
  resolvedPackCache.set(packId, pack);
}

export function getCachedPack(packId: IconPackId): IconPackModule | null {
  return resolvedPackCache.get(packId) ?? null;
}

export function cachePackModule(
  packId: IconPackId,
  promise: Promise<IconPackModule>,
): Promise<IconPackModule> {
  const existing = moduleCache.get(packId);
  if (existing) {
    return existing;
  }

  const tracked = promise.then((pack) => {
    resolvedPackCache.set(packId, pack);
    return pack;
  });

  moduleCache.set(packId, tracked);
  return tracked;
}

export function clearIconCaches(): void {
  moduleCache.clear();
  resolvedPackCache.clear();
  activePack = null;
  activePackId = null;
}

export function __setActivePackForTests(
  packId: IconPackId,
  pack: IconPackModule,
): void {
  setActivePack(packId, pack);
}

export function __resetIconCachesForTests(): void {
  clearIconCaches();
}
