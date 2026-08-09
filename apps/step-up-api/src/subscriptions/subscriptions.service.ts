import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  BillingCadence,
  type FamilyPack,
  type IndividualAudience,
  type Prisma,
  SubscriptionKind,
} from "@prisma/client";
import { seatsForCatalog } from "../memberships/membership-helpers";
import { PrismaService } from "../prisma/prisma.service";

export type CreateSubscriptionInput = {
  studioId: string;
  name: string;
  kind: SubscriptionKind;
  individualAudience?: IndividualAudience;
  familyPack?: FamilyPack;
  billingCadence?: BillingCadence;
  price: number;
  active?: boolean;
};

export type UpdateSubscriptionInput = {
  name?: string;
  billingCadence?: BillingCadence;
  price?: number;
  active?: boolean;
};

@Injectable()
export class SubscriptionsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listByStudio(studioId: string) {
    const rows = await this.prisma.subscription.findMany({
      where: { studioId },
      orderBy: [{ kind: "asc" }, { name: "asc" }, { billingCadence: "asc" }],
      include: {
        _count: {
          select: { memberships: true, batchPlans: true },
        },
      },
    });
    return rows.map((row) => this.withUsage(row));
  }

  async getById(id: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        _count: {
          select: { memberships: true, batchPlans: true },
        },
      },
    });
    if (!subscription) {
      throw new NotFoundException("Subscription not found");
    }
    return this.withUsage(subscription);
  }

  create(creatorId: string, data: CreateSubscriptionInput) {
    const seats = this.resolveSeats(data);
    return this.prisma.subscription.create({
      data: {
        studioId: data.studioId,
        creatorId,
        name: data.name,
        kind: data.kind,
        individualAudience: seats.individualAudience,
        familyPack: seats.familyPack,
        billingCadence: data.billingCadence ?? BillingCadence.MONTHLY,
        adultSeats: seats.adultSeats,
        kidSeats: seats.kidSeats,
        price: data.price,
        active: data.active ?? true,
      },
    });
  }

  update(id: string, data: UpdateSubscriptionInput) {
    const patch: Prisma.SubscriptionUpdateInput = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.billingCadence !== undefined) {
      patch.billingCadence = data.billingCadence;
    }
    if (data.price !== undefined) patch.price = data.price;
    if (data.active !== undefined) patch.active = data.active;
    return this.prisma.subscription.update({ where: { id }, data: patch });
  }

  async remove(id: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        _count: {
          select: { memberships: true, batchPlans: true },
        },
      },
    });
    if (!subscription) {
      throw new NotFoundException("Subscription not found");
    }
    if (subscription._count.memberships > 0) {
      throw new ConflictException(
        "Cannot delete a plan that has memberships. Deactivate it instead.",
      );
    }
    if (subscription._count.batchPlans > 0) {
      throw new ConflictException(
        "Cannot delete a plan that is attached to batches. Remove it from batches first, or deactivate it instead.",
      );
    }
    return this.prisma.subscription.delete({ where: { id } });
  }

  private withUsage<
    T extends {
      _count: { memberships: number; batchPlans: number };
    },
  >(subscription: T) {
    const { _count, ...rest } = subscription;
    return {
      ...rest,
      membershipCount: _count.memberships,
      batchPlanCount: _count.batchPlans,
      canDelete: _count.memberships === 0 && _count.batchPlans === 0,
    };
  }

  private resolveSeats(data: CreateSubscriptionInput) {
    if (data.kind === SubscriptionKind.FAMILY) {
      throw new BadRequestException(
        "Family pack plans are no longer created. Combine unpaid household invoices from the Invoices family tab.",
      );
    }
    if (!data.individualAudience) {
      throw new BadRequestException(
        "individualAudience is required for Individual subscriptions",
      );
    }
    if (data.familyPack) {
      throw new BadRequestException(
        "familyPack is not allowed on Individual subscriptions",
      );
    }
    const seats = seatsForCatalog({
      kind: SubscriptionKind.INDIVIDUAL,
      individualAudience: data.individualAudience,
    });
    return {
      individualAudience: data.individualAudience,
      familyPack: null as FamilyPack | null,
      ...seats,
    };
  }
}
