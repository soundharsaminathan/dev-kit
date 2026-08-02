import { Module } from "@nestjs/common";
import { MediaModule } from "../media/media.module";
import { UserCryptoModule } from "../users/user-crypto.module";
import { StudiosController } from "./studios.controller";
import { StudiosService } from "./studios.service";

@Module({
  imports: [UserCryptoModule, MediaModule],
  controllers: [StudiosController],
  providers: [StudiosService],
  exports: [StudiosService],
})
export class StudiosModule {}
