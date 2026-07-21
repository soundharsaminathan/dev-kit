import { Module } from "@nestjs/common";
import { BatchesModule } from "../batches/batches.module";
import { AchievementsService } from "./achievements.service";
import { GoalsService } from "./goals.service";
import { HomeController } from "./home.controller";
import { HomeService } from "./home.service";

@Module({
  imports: [BatchesModule],
  controllers: [HomeController],
  providers: [HomeService, GoalsService, AchievementsService],
  exports: [HomeService, GoalsService, AchievementsService],
})
export class HomeModule {}
