import { describe, expect, it } from "vitest";
import type { IconPackModule } from "../core/types";
import {
  __clearCustomPacksForTests,
  __resetIconCachesForTests,
  registerIconPack,
} from "../index";
import { loadIconPack } from "../loaders/pack-loaders";

const testPack: IconPackModule = {
  id: "test",
  icons: {},
};

describe("loadIconPack", () => {
  it("loads a pack from custom registrations", async () => {
    __resetIconCachesForTests();
    __clearCustomPacksForTests();

    registerIconPack("custom", {
      load: async () => ({ default: testPack }),
    });

    await expect(loadIconPack("custom")).resolves.toEqual(testPack);
  });

  it("loads a pack from an explicit loader map", async () => {
    await expect(
      loadIconPack("inline", {
        inline: async () => ({ default: testPack }),
      }),
    ).resolves.toEqual(testPack);
  });

  it("throws for unknown packs", async () => {
    await expect(loadIconPack("missing-pack", {})).rejects.toThrow(
      "Unknown icon pack: missing-pack",
    );
  });
});
