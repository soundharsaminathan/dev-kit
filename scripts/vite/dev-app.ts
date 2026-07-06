/** Pre-bundle React before the dev server accepts requests (avoids Playwright race). */
export const CORE_OPTIMIZE_DEPS = ["react", "react-dom"] as const;

export const devAppOptimizeDeps = {
  holdUntilCrawlEnd: true,
};
