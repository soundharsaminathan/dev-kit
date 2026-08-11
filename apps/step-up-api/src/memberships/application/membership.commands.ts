import { Inject, Injectable } from "@nestjs/common";
import { MembershipsService } from "../memberships.service";

@Injectable()
export class MembershipCommandsService {
  constructor(
    @Inject(MembershipsService)
    private readonly memberships: MembershipsService,
  ) {}

  requestRenewalInvoice(membershipId: string) {
    return this.memberships.requestRenewalInvoice(membershipId);
  }
}
