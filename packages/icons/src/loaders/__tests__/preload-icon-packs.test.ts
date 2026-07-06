import { describe, expect, it, vi } from "vitest";
import type { IconPackModule } from "../../core/types";
import {
  __resetIconCachesForTests,
  cachePackModule,
  getCachedPack,
} from "../../index";
import { preloadIconPacks } from "../preload-icon-packs";

const testPack: IconPackModule = {
  id: "test",
  icons: {},
};

describe("preloadIconPacks", () => {
  it("loads every pack from the loader map", async () => {
    __resetIconCachesForTests();

    const loaders = {
      alpha: vi.fn(async () => ({ default: { ...testPack, id: "alpha" } })),
      beta: vi.fn(async () => ({ default: { ...testPack, id: "beta" } })),
    };

    await preloadIconPacks(loaders, ["alpha", "beta"]);

    expect(loaders.alpha).toHaveBeenCalledOnce();
    expect(loaders.beta).toHaveBeenCalledOnce();
    expect(getCachedPack("alpha")?.id).toBe("alpha");
    expect(getCachedPack("beta")?.id).toBe("beta");
  });

  it("skips packs that are already cached", async () => {
    __resetIconCachesForTests();

    const loaders = {
      alpha: vi.fn(async () => ({ default: { ...testPack, id: "alpha" } })),
    };

    await cachePackModule(
      "alpha",
      loaders.alpha().then((mod) => mod.default),
    );

    await preloadIconPacks(loaders, ["alpha"]);

    expect(loaders.alpha).toHaveBeenCalledOnce();
  });
});
