import { Module } from "@nestjs/common";
import { MediaService } from "../media/media.service";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService, MediaService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
