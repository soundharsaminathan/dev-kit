import {
  ConflictException,
  Inject,
  Injectable,
} from "@nestjs/common";
import type { StudioDataImport } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { ImportStudioDataDto } from "./dto/import-studio-data.dto";
import {
  importBatchNamesMatch,
  resolveImportBatchName,
} from "./import-batch-name";

@Injectable()
export class ImportLockService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  resolveImportBatchName(dto: ImportStudioDataDto): string | null {
    return resolveImportBatchName(dto);
  }

  async getActiveImport(studioId: string): Promise<StudioDataImport | null> {
    return this.prisma.studioDataImport.findFirst({
      where: {
        studioId,
        status: { in: ["PENDING", "RUNNING"] },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getActiveImportBatchName(studioId: string): Promise<string | null> {
    const active = await this.getActiveImport(studioId);
    if (!active) {
      return null;
    }
    return resolveImportBatchName(active.payload as ImportStudioDataDto);
  }

  async assertBatchUnlocked(studioId: string, batchId: string): Promise<void> {
    const lockedName = await this.getActiveImportBatchName(studioId);
    if (!lockedName) {
      return;
    }

    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      select: { name: true },
    });
    if (!batch) {
      return;
    }

    if (importBatchNamesMatch(batch.name, lockedName)) {
      throw new ConflictException(
        `"${batch.name}" is locked while import is in progress.`,
      );
    }
  }

  async assertBatchNameUnlocked(
    studioId: string,
    batchName: string,
  ): Promise<void> {
    const lockedName = await this.getActiveImportBatchName(studioId);
    if (!lockedName || !importBatchNamesMatch(batchName, lockedName)) {
      return;
    }

    throw new ConflictException(
      `"${batchName.trim()}" is locked while import is in progress.`,
    );
  }
}
