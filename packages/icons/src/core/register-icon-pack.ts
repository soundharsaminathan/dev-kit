import type { IconPackId } from "./types";

export type IconPackRegistration = {
  load: () => Promise<{ default: import("./types").IconPackModule }>;
  variants?: string[] | undefined;
};

const customPackLoaders = new Map<IconPackId, IconPackRegistration["load"]>();

export function registerIconPack(
  packId: IconPackId,
  registration: IconPackRegistration,
): void {
  customPackLoaders.set(packId, registration.load);
}

export function getCustomPackLoader(
  packId: IconPackId,
): IconPackRegistration["load"] | undefined {
  return customPackLoaders.get(packId);
}

export function getCustomPackIds(): IconPackId[] {
  return [...customPackLoaders.keys()];
}

export function __clearCustomPacksForTests(): void {
  customPackLoaders.clear();
}
