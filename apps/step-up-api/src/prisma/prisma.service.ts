import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      transactionOptions: {
        // Remote DB / pooler RTT can exceed Prisma's 5s default during
        // seat locks + capacity checks inside enroll/booking transactions.
        timeout: 20_000,
      },
    });
  }

  async onModuleInit() {
    // Cap connect wait so Cloud Run can fail fast / still bind PORT instead of
    // hanging forever when DB or VPC networking is misconfigured.
    await Promise.race([
      this.$connect(),
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("Prisma $connect timed out after 15s")),
          15_000,
        );
      }),
    ]);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
