import { getCustomPackLoader } from "../core/register-icon-pack";
import type { IconPackModule } from "../core/types";
import { generatedPackLoaders } from "./pack-loaders.generated";

export type PackLoaderMap = Record<
  string,
  () => Promise<{ default: IconPackModule }>
>;

export const defaultPackLoaders = {
  ...generatedPackLoaders,
} as PackLoaderMap;

export async function loadIconPack(
  packId: string,
  loaders: PackLoaderMap = defaultPackLoaders,
): Promise<IconPackModule> {
  const customLoader = getCustomPackLoader(packId);
  if (customLoader) {
    const mod = await customLoader();
    return mod.default;
  }

  const loader = loaders[packId];
  if (!loader) {
    throw new Error(`Unknown icon pack: ${packId}`);
  }

  const mod = await loader();
  return mod.default;
}
