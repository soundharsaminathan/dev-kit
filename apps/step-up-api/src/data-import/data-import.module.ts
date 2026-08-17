import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { DataImportController } from "./data-import.controller";
import { DataImportService } from "./data-import.service";

@Module({
  imports: [UsersModule],
  controllers: [DataImportController],
  providers: [DataImportService],
  exports: [DataImportService],
})
export class DataImportModule {}
