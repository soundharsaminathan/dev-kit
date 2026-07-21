import { Global, Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { FirebaseService } from "./firebase.service";
import { RolesGuard } from "./roles.guard";
import { TokenGuard } from "./token.guard";

@Global()
@Module({
  imports: [NotificationsModule],
  controllers: [AuthController],
  providers: [FirebaseService, AuthGuard, TokenGuard, RolesGuard],
  exports: [FirebaseService, AuthGuard, TokenGuard, RolesGuard],
})
export class AuthModule {}
