import type { IconPackModule } from "@dev-ui/icons";

const EMPTY_LUCIDE_PACK: IconPackModule = {
  id: "lucide",
  icons: {},
};

let lucidePack: IconPackModule | null = null;
let lucidePromise: Promise<IconPackModule> | null = null;

/** Empty pack for first paint — icons resolve after idle preload. */
export function getEmptyLucidePack() {
  return EMPTY_LUCIDE_PACK;
}

export function preloadLucidePack() {
  if (lucidePack) {
    return Promise.resolve(lucidePack);
  }
  lucidePromise ??= import("@dev-ui/icons-packs/lucide").then((mod) => {
    lucidePack = mod.default;
    return mod.default;
  });
  return lucidePromise;
}

export function getCachedLucidePack() {
  return lucidePack;
}
