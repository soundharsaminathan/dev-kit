import { Inject, Injectable } from "@nestjs/common";
import { BillingCadence, type PlanType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const planBatchInclude = {
  monthlyBatches: true,
  fullBatchBatches: true,
} as const;

@Injectable()
export class PlansService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  listByStudio(studioId: string) {
    return this.prisma.plan.findMany({
      where: { studioId },
      include: planBatchInclude,
      orderBy: { name: "asc" },
    });
  }

  getById(id: string) {
    return this.prisma.plan.findUniqueOrThrow({
      where: { id },
      include: planBatchInclude,
    });
  }

  create(
    creatorId: string,
    data: {
      studioId: string;
      name: string;
      type: PlanType;
      billingCadence?: BillingCadence;
      classCredits?: number;
      priceMonthly: number;
      active?: boolean;
    },
  ) {
    return this.prisma.plan.create({
      data: {
        studioId: data.studioId,
        creatorId,
        name: data.name,
        type: data.type,
        billingCadence: data.billingCadence ?? BillingCadence.MONTHLY,
        classCredits: data.classCredits,
        priceMonthly: data.priceMonthly,
        active: data.active ?? true,
      },
    });
  }

  update(
    id: string,
    data: {
      name?: string;
      billingCadence?: BillingCadence;
      priceMonthly?: number;
      active?: boolean;
      classCredits?: number;
    },
  ) {
    return this.prisma.plan.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.plan.delete({ where: { id } });
  }
}
