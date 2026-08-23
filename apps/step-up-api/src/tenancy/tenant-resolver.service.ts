import {
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { StudioStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { TenantResolveInput } from "./studio-context";

const studioSelect = {
  id: true,
  slug: true,
  name: true,
  status: true,
  logoUrl: true,
  address: true,
  contact: true,
} as const;

export type ResolvedStudio = {
  id: string;
  slug: string;
  name: string;
  status: StudioStatus;
  logoUrl: string | null;
  address: string | null;
  contact: string | null;
};

@Injectable()
export class TenantResolverService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async resolve(input: TenantResolveInput): Promise<ResolvedStudio> {
    const value = input.value.trim();
    if (!value) {
      throw new NotFoundException("Studio not found");
    }

    const studio =
      input.kind === "slug"
        ? await this.prisma.studio.findUnique({
            where: { slug: value },
            select: studioSelect,
          })
        : await this.prisma.studio.findUnique({
            where: { id: value },
            select: studioSelect,
          });

    if (!studio) {
      throw new NotFoundException("Studio not found");
    }

    return studio;
  }

  async resolveActive(input: TenantResolveInput): Promise<ResolvedStudio> {
    const studio = await this.resolve(input);
    if (studio.status !== StudioStatus.ACTIVE) {
      throw new NotFoundException("Studio not found");
    }
    return studio;
  }
}
