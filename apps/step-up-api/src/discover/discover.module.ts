import { Module } from "@nestjs/common";
import { MediaModule } from "../media/media.module";
import { PrismaModule } from "../prisma/prisma.module";
import { DiscoverController } from "./discover.controller";
import { DiscoverService } from "./discover.service";

@Module({
  imports: [PrismaModule, MediaModule],
  controllers: [DiscoverController],
  providers: [DiscoverService],
  exports: [DiscoverService],
})
export class DiscoverModule {}
