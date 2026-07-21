import {
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { DecryptedUser } from "../users/user-crypto.service";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get()
  list(@CurrentUser() user: DecryptedUser) {
    return this.notificationsService.listForUser(user.id);
  }

  @Patch(":id/read")
  markRead(@CurrentUser() user: DecryptedUser, @Param("id") id: string) {
    return this.notificationsService.markReadOne(user.id, id);
  }
}
