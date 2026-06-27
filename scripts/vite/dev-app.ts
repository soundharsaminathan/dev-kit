/**
 * Icon libraries pulled in by @dev-ui/icons-packs. Vite's dep scanner follows
 * the static dynamic imports in pack-loaders.generated.ts and eagerly pre-bundles
 * every pack (and its peer icon library) on dev startup — even though only one
 * pack is used initially. Exclude them so packs load on demand when switched.
 */
const LAZY_ICON_LIBRARIES = [
  "@dev-ui/icons-packs",
  "@fluentui/react-icons",
  "@heroicons/react",
  "@phosphor-icons/react",
  "@tabler/icons-react",
  "@fontsource-variable/material-symbols-outlined",
  "@fontsource-variable/material-symbols-rounded",
  "@fontsource-variable/material-symbols-sharp",
] as const;

/** Pre-bundle React before the dev server accepts requests (avoids Playwright race). */
export const CORE_OPTIMIZE_DEPS = ["react", "react-dom"] as const;

export const devAppOptimizeDeps = {
  exclude: [...LAZY_ICON_LIBRARIES],
  holdUntilCrawlEnd: true,
};
