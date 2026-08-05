import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { MediaModule } from "../media/media.module";
import { PaymentsModule } from "../payments/payments.module";
import { UserCryptoModule } from "../users/user-crypto.module";
import { UsersModule } from "../users/users.module";
import { StudiosController } from "./studios.controller";
import { StudiosService } from "./studios.service";

@Module({
  imports: [
    AuthModule,
    UserCryptoModule,
    MediaModule,
    PaymentsModule,
    UsersModule,
  ],
  controllers: [StudiosController],
  providers: [StudiosService],
  exports: [StudiosService],
})
export class StudiosModule {}
