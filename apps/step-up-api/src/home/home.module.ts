import { Module } from "@nestjs/common";
import { AchievementsService } from "./achievements.service";
import { GoalsService } from "./goals.service";
import { HomeController } from "./home.controller";
import { HomeService } from "./home.service";

@Module({
  controllers: [HomeController],
  providers: [HomeService, GoalsService, AchievementsService],
  exports: [HomeService, GoalsService, AchievementsService],
})
export class HomeModule {}
