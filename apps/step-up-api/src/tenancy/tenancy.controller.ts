import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Query,
} from "@nestjs/common";
import { TenantResolverService } from "./tenant-resolver.service";

@Controller("tenants")
export class TenancyController {
  constructor(
    @Inject(TenantResolverService)
    private readonly tenants: TenantResolverService,
  ) {}

  /**
   * Public tenant resolution. Prefer `?studio=<slug>`; `studioId` kept for compat.
   * Future: host-based resolution plugs into the same TenantResolverService.
   */
  @Get("resolve")
  async resolve(
    @Query("studio") studioSlug?: string,
    @Query("studioId") studioId?: string,
  ) {
    const slug = studioSlug?.trim();
    if (slug) {
      return this.tenants.resolveActive({ kind: "slug", value: slug });
    }
    const id = studioId?.trim();
    if (id) {
      return this.tenants.resolveActive({ kind: "id", value: id });
    }
    throw new BadRequestException("Provide studio (slug) or studioId");
  }
}
