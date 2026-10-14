import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { MediaService } from "../media/media.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  normalizeCertificateLayout,
  SAMPLE_CERTIFICATE_LAYOUT,
} from "./certificate-layout";

export { SAMPLE_CERTIFICATE_LAYOUT } from "./certificate-layout";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

@Injectable()
export class CertificatesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MediaService) private readonly media: MediaService,
  ) {}

  async listByStudio(studioId: string) {
    await this.ensureSample(studioId);
    const templates = await this.prisma.certificateTemplate.findMany({
      where: { studioId },
      orderBy: [{ isSample: "desc" }, { name: "asc" }],
    });
    return Promise.all(
      templates.map(async (template) => ({
        ...template,
        layoutJson: await this.signLayoutMedia(template.layoutJson),
      })),
    );
  }

  async getById(id: string) {
    const template = await this.prisma.certificateTemplate.findUnique({
      where: { id },
    });
    if (!template) {
      throw new NotFoundException("Certificate template not found");
    }
    return {
      ...template,
      layoutJson: await this.signLayoutMedia(template.layoutJson),
    };
  }

  async create(data: { studioId: string; name: string; layoutJson: unknown }) {
    const layoutJson = await this.persistLayoutMedia(
      normalizeCertificateLayout(data.layoutJson),
    );

    return this.prisma.certificateTemplate.create({
      data: {
        studioId: data.studioId,
        name: data.name.trim(),
        layoutJson,
      },
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      layoutJson?: unknown;
    },
  ) {
    const template = await this.prisma.certificateTemplate.findUnique({
      where: { id },
    });
    if (!template) {
      throw new NotFoundException("Certificate template not found");
    }

    const layoutJson =
      data.layoutJson !== undefined
        ? await this.persistLayoutMedia(
            normalizeCertificateLayout(data.layoutJson),
          )
        : undefined;

    const updated = await this.prisma.certificateTemplate.update({
      where: { id: template.id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(layoutJson !== undefined ? { layoutJson } : {}),
      },
    });

    return {
      ...updated,
      layoutJson: await this.signLayoutMedia(updated.layoutJson),
    };
  }

  async remove(id: string) {
    const template = await this.prisma.certificateTemplate.findUnique({
      where: { id },
    });
    if (!template) {
      throw new NotFoundException("Certificate template not found");
    }

    if (template.isSample) {
      throw new BadRequestException("The sample template cannot be deleted");
    }

    const issuedCount = await this.prisma.contestCertificate.count({
      where: { templateId: id },
    });
    if (issuedCount > 0) {
      throw new ConflictException(
        "This template has issued certificates and cannot be deleted",
      );
    }

    return this.prisma.certificateTemplate.delete({ where: { id } });
  }

  ensureSample(studioId: string) {
    return this.prisma.certificateTemplate.upsert({
      where: { id: `cert-sample-${studioId}` },
      update: {},
      create: {
        id: `cert-sample-${studioId}`,
        studioId,
        name: "Classic completion",
        isSample: true,
        layoutJson: SAMPLE_CERTIFICATE_LAYOUT,
      },
    });
  }

  private async signMediaValue(value: unknown): Promise<unknown> {
    if (typeof value !== "string" || !value.trim()) return value;
    return (await this.media.signReadUrl(value)) ?? value;
  }

  private async signLayoutMedia(layoutJson: unknown): Promise<unknown> {
    if (!isRecord(layoutJson)) return layoutJson;
    const next = structuredClone(layoutJson);
    const page = isRecord(next.page) ? next.page : null;
    const background =
      page && isRecord(page.background) ? page.background : null;
    if (background && typeof background.imageUrl === "string") {
      background.imageUrl = (await this.signMediaValue(
        background.imageUrl,
      )) as string;
    }
    if (Array.isArray(next.elements)) {
      for (const el of next.elements) {
        if (!isRecord(el)) continue;
        if (typeof el.src === "string") {
          el.src = (await this.signMediaValue(el.src)) as string;
        }
      }
    }
    return next;
  }

  private async persistLayoutMedia(layoutJson: unknown): Promise<object> {
    if (!isRecord(layoutJson)) {
      return layoutJson as object;
    }
    const next = structuredClone(layoutJson);
    const page = isRecord(next.page) ? next.page : null;
    const background =
      page && isRecord(page.background) ? page.background : null;
    if (background && typeof background.imageUrl === "string") {
      background.imageUrl =
        this.media.resolveObjectKey(background.imageUrl) ?? background.imageUrl;
    }
    if (Array.isArray(next.elements)) {
      for (const el of next.elements) {
        if (!isRecord(el)) continue;
        if (typeof el.src === "string") {
          el.src = this.media.resolveObjectKey(el.src) ?? el.src;
        }
      }
    }
    return next;
  }
}
