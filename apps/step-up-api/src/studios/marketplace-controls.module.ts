import { Module } from "@nestjs/common";
import { MediaModule } from "../media/media.module";
import { UserCryptoModule } from "../users/user-crypto.module";
import { MarketplaceControlsService } from "./marketplace-controls.service";

@Module({
  imports: [UserCryptoModule, MediaModule],
  providers: [MarketplaceControlsService],
  exports: [MarketplaceControlsService],
})
export class MarketplaceControlsModule {}
