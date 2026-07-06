import { cachePackModule, getCachedPack } from "../core/icon-cache";
import type { IconPackId } from "../core/types";
import { packIds } from "../generated/pack-ids";
import {
  defaultPackLoaders,
  loadIconPack,
  type PackLoaderMap,
} from "./pack-loaders";

export function preloadIconPacks(
  loaders: PackLoaderMap = defaultPackLoaders,
  ids: readonly IconPackId[] = packIds,
): Promise<void> {
  const pending = ids.map((packId) => {
    if (getCachedPack(packId)) {
      return Promise.resolve();
    }

    const loader = loaders[packId];
    if (!loader) {
      return Promise.resolve();
    }

    return cachePackModule(packId, loadIconPack(packId, loaders));
  });

  return Promise.all(pending).then(() => undefined);
}
