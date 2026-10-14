import { Inject, Injectable } from "@nestjs/common";
import type { MarketplaceSlugKind } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { followSlugRedirects } from "./slug-redirect";

@Injectable()
export class SlugRedirectService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async resolve(
    kind: MarketplaceSlugKind,
    idOrSlug: string,
  ): Promise<string> {
    try {
      const rows = await this.prisma.slugRedirect.findMany({
        where: { kind },
        select: { fromSlug: true, toSlug: true },
      });
      return followSlugRedirects(
        idOrSlug,
        new Map(rows.map((row) => [row.fromSlug, row.toSlug])),
      );
    } catch {
      return idOrSlug;
    }
  }

  async record(
    kind: MarketplaceSlugKind,
    fromSlug: string,
    toSlug: string,
  ): Promise<void> {
    if (!fromSlug || !toSlug || fromSlug === toSlug) return;
    await this.prisma.slugRedirect.upsert({
      where: { kind_fromSlug: { kind, fromSlug } },
      create: { kind, fromSlug, toSlug },
      update: { toSlug },
    });
    await this.prisma.slugRedirect.updateMany({
      where: { kind, toSlug: fromSlug },
      data: { toSlug },
    });
  }
}
