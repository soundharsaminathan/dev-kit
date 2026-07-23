import { BadRequestException, Inject, Injectable } from "@nestjs/common";
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

  listByStudio(studioId: string) {
    return this.prisma.subscription.findMany({
      where: { studioId },
      orderBy: [{ kind: "asc" }, { name: "asc" }, { billingCadence: "asc" }],
    });
  }

  getById(id: string) {
    return this.prisma.subscription.findUniqueOrThrow({ where: { id } });
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

  remove(id: string) {
    return this.prisma.subscription.delete({ where: { id } });
  }

  private resolveSeats(data: CreateSubscriptionInput) {
    if (data.kind === SubscriptionKind.INDIVIDUAL) {
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

    if (!data.familyPack) {
      throw new BadRequestException(
        "familyPack is required for Family subscriptions",
      );
    }
    if (data.individualAudience) {
      throw new BadRequestException(
        "individualAudience is not allowed on Family subscriptions",
      );
    }
    const seats = seatsForCatalog({
      kind: SubscriptionKind.FAMILY,
      familyPack: data.familyPack,
    });
    return {
      individualAudience: null as IndividualAudience | null,
      familyPack: data.familyPack,
      ...seats,
    };
  }
}
