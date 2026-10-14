import { Module } from "@nestjs/common";
import { UserCryptoModule } from "../users/user-crypto.module";
import { WhatsappService } from "./whatsapp.service";

@Module({
  imports: [UserCryptoModule],
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
