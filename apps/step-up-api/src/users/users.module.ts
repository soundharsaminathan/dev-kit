import { Module, forwardRef } from "@nestjs/common";
import { DataImportModule } from "../data-import/data-import.module";
import { MediaModule } from "../media/media.module";
import { SocialModule } from "../social/social.module";
import { UserPresenter } from "./user-presenter";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [SocialModule, MediaModule, forwardRef(() => DataImportModule)],
  controllers: [UsersController],
  providers: [UsersService, UserPresenter],
  exports: [UsersService, UserPresenter],
})
export class UsersModule {}
