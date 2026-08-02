import { Module } from "@nestjs/common";
import { EmailModule } from "../email/email.module";
import { UserCryptoModule } from "../users/user-crypto.module";
import { StaffInvitesController } from "./staff-invites.controller";
import { StaffInvitesService } from "./staff-invites.service";

@Module({
  imports: [EmailModule, UserCryptoModule],
  controllers: [StaffInvitesController],
  providers: [StaffInvitesService],
  exports: [StaffInvitesService],
})
export class StaffInvitesModule {}
