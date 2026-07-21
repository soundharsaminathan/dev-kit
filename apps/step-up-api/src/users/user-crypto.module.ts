import { Global, Module } from "@nestjs/common";
import { UserCryptoService } from "./user-crypto.service";

@Global()
@Module({
  providers: [UserCryptoService],
  exports: [UserCryptoService],
})
export class UserCryptoModule {}
