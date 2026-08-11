import { forwardRef, Global, Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { StaffInvitesModule } from "../staff-invites/staff-invites.module";
import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { FirebaseService } from "./firebase.service";
import { RolesGuard } from "./roles.guard";
import { TokenGuard } from "./token.guard";

@Global()
@Module({
  imports: [NotificationsModule, forwardRef(() => StaffInvitesModule)],
  controllers: [AuthController],
  providers: [
    AuthService,
    FirebaseService,
    AuthGuard,
    TokenGuard,
    RolesGuard,
  ],
  exports: [AuthService, FirebaseService, AuthGuard, TokenGuard, RolesGuard],
})
export class AuthModule {}
