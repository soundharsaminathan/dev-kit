import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { AuthUser } from "../auth/current-user.decorator";
import { assertSameCompany, requireCompany } from "../common/tenancy";
import type { DocumentEntityType } from "../generated/prisma/client";
import { MediaService } from "../media/media.service";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateDocumentDto, SignedUrlDto } from "./dto/document.dto";

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MediaService) private readonly media: MediaService,
  ) {}

  async createSignedUploadUrl(actor: AuthUser, dto: SignedUrlDto) {
    requireCompany(actor);
    return this.media.createSignedUploadUrl(dto.fileName, dto.contentType);
  }

  async listByEntity(
    actor: AuthUser,
    entityType: DocumentEntityType,
    entityId: string,
  ) {
    const companyId = requireCompany(actor);
    const rows = await this.prisma.document.findMany({
      where: { companyId, entityType, entityId },
      orderBy: { createdAt: "desc" },
    });
    return Promise.all(
      rows.map(async (doc) => ({
        ...doc,
        readUrl: await this.media.signReadUrl(doc.objectKey),
      })),
    );
  }

  async create(actor: AuthUser, dto: CreateDocumentDto) {
    const companyId = requireCompany(actor);
    const doc = await this.prisma.document.create({
      data: {
        companyId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        kind: dto.kind,
        objectKey: dto.objectKey,
        fileName: dto.fileName,
        contentType: dto.contentType,
        sizeBytes: dto.sizeBytes,
        uploadedById: actor.id,
      },
    });
    return {
      ...doc,
      readUrl: await this.media.signReadUrl(doc.objectKey),
    };
  }

  async delete(actor: AuthUser, id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException("Document not found");
    assertSameCompany(actor, doc.companyId);
    await this.prisma.document.delete({ where: { id } });
    return { deleted: true };
  }
}
