import { Module } from "@nestjs/common";
import { MediaModule } from "../media/media.module";
import { PrismaModule } from "../prisma/prisma.module";
import { DiscoverController } from "./discover.controller";
import { DiscoverService } from "./discover.service";
import { MarketplaceCatalogService } from "./marketplace-catalog.service";
import { SlugRedirectService } from "./slug-redirect.service";

@Module({
  imports: [PrismaModule, MediaModule],
  controllers: [DiscoverController],
  providers: [DiscoverService, MarketplaceCatalogService, SlugRedirectService],
  exports: [DiscoverService, MarketplaceCatalogService, SlugRedirectService],
})
export class DiscoverModule {}
