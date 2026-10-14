import { Inject, Injectable } from "@nestjs/common";
import { MembershipsService } from "../memberships.service";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class MembershipQueriesService {
  constructor(
    @Inject(MembershipsService)
    private readonly memberships: MembershipsService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  listForStudent(studentId: string) {
    return this.memberships.listForStudent(studentId);
  }

  async getPurchaserUserId(membershipId: string): Promise<string | null> {
    const membership = await this.prisma.membership.findUnique({
      where: { id: membershipId },
      select: { purchaserUserId: true },
    });
    return membership?.purchaserUserId ?? null;
  }
}
