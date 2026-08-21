import { Global, Module } from "@nestjs/common";
import { FeatureGuard } from "./feature.guard";
import { StudioFeaturesController } from "./studio-features.controller";
import { StudioFeaturesService } from "./studio-features.service";

@Global()
@Module({
  controllers: [StudioFeaturesController],
  providers: [StudioFeaturesService, FeatureGuard],
  exports: [StudioFeaturesService, FeatureGuard],
})
export class StudioFeaturesModule {}
