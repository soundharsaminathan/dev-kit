import { Global, Module } from "@nestjs/common";
import { StudioContextGuard } from "./studio-context.guard";
import { TenantResolverService } from "./tenant-resolver.service";
import { TenancyController } from "./tenancy.controller";

@Global()
@Module({
  controllers: [TenancyController],
  providers: [TenantResolverService, StudioContextGuard],
  exports: [TenantResolverService, StudioContextGuard],
})
export class TenancyModule {}
