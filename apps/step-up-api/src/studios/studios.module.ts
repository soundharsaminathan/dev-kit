import { Module } from "@nestjs/common";
import { StudiosController } from "./studios.controller";
import { StudiosService } from "./studios.service";

@Module({
  controllers: [StudiosController],
  providers: [StudiosService],
  exports: [StudiosService],
})
export class StudiosModule {}
