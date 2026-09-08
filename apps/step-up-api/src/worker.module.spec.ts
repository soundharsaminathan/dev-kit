import { MODULE_METADATA } from "@nestjs/common/constants";
import { beforeAll, describe, expect, it } from "vitest";
import { AuthModule } from "./auth/auth.module";
import { MediaModule } from "./media/media.module";
import { StudioFeaturesModule } from "./studio-features/studio-features.module";

describe("WorkerModule", () => {
  let imports: unknown[];

  beforeAll(async () => {
    // forRoot({ role: "worker" }) throws at import time without REDIS_URL.
    process.env.REDIS_URL ||= "redis://127.0.0.1:6379";
    const { WorkerModule } = await import("./worker.module");
    imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, WorkerModule) as unknown[];
  });

  it("imports AuthModule so FirebaseService and AuthGuard resolve at boot", () => {
    expect(imports).toContain(AuthModule);
  });

  it("imports StudioFeaturesModule so FeatureGuard on pulled-in controllers resolves", () => {
    expect(imports).toContain(StudioFeaturesModule);
  });

  it("imports MediaModule so FirebaseService can inject MediaService", () => {
    expect(imports).toContain(MediaModule);
  });
});
