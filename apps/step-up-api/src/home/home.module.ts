import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { AchievementsService } from "./achievements.service";
import { HomeQueriesService } from "./application/home.queries";
import { GoalsService } from "./goals.service";
import { HomeController } from "./home.controller";
import { HomeService } from "./home.service";

@Module({
  imports: [UsersModule],
  controllers: [HomeController],
  providers: [
    HomeService,
    HomeQueriesService,
    GoalsService,
    AchievementsService,
  ],
  exports: [
    HomeService,
    HomeQueriesService,
    GoalsService,
    AchievementsService,
  ],
})
export class HomeModule {}
