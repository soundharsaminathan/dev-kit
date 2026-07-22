export { iconCatalog } from "./catalog/icon-catalog";
export type { PackId } from "./catalog/pack-libraries";
export { packLibraries } from "./catalog/pack-libraries";
export { Icon } from "./core/Icon";
export { IconButton } from "./core/IconButton";
export { IconProvider, useIcons } from "./core/IconProvider";
export {
  __resetIconCachesForTests,
  __setActivePackForTests,
  cachePackModule,
  getActivePack,
  getCachedPack,
  setActivePack,
} from "./core/icon-cache";
export {
  __clearCustomPacksForTests,
  registerIconPack,
} from "./core/register-icon-pack";
export type {
  IconButtonProps,
  IconComponent,
  IconContextValue,
  IconPackId,
  IconPackModule,
  IconProps,
  IconTheme,
} from "./core/types";
export { resolveIconTheme, resolvePackId } from "./core/types";
export type { IconName } from "./generated/icon-names";
export { iconNames } from "./generated/icon-names";
export type { GeneratedPackId } from "./generated/pack-ids";
export { packIds } from "./generated/pack-ids";
export type { PackLoaderMap } from "./loaders/pack-loaders";
