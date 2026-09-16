import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
} from "@nestjs/common";
import type { AuthUser } from "../auth/current-user.decorator";
import { ClosuresService } from "../closures/closures.service";
import { LoanRestructureService } from "../closures/loan-restructure.service";
import { CustomersService } from "../customers/customers.service";
import { type ApprovalRequest, ApprovalType } from "../generated/prisma";
import { LoansService } from "../loans/loans.service";
import { PaymentsService } from "../payments/payments.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ApprovalApplicatorService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(forwardRef(() => LoansService))
    private readonly loans: LoansService,
    @Inject(forwardRef(() => PaymentsService))
    private readonly payments: PaymentsService,
    @Inject(forwardRef(() => CustomersService))
    private readonly customers: CustomersService,
    @Inject(ClosuresService) private readonly closures: ClosuresService,
    @Inject(LoanRestructureService)
    private readonly restructure: LoanRestructureService,
  ) {}

  async apply(actor: AuthUser, request: ApprovalRequest) {
    if (request.appliedAt) {
      throw new BadRequestException("Approval already applied");
    }

    const payload = request.payload as Record<string, unknown>;

    switch (request.type) {
      case ApprovalType.LOAN_APPROVAL:
        await this.loans.applyLoanApproval(actor, request.entityId);
        break;
      case ApprovalType.PRODUCT_OVERRIDE:
        break;
      case ApprovalType.RATE_CHANGE:
        await this.loans.applyRateChangeFromApproval(
          actor,
          request.entityId,
          Number(payload.newRate),
        );
        break;
      case ApprovalType.PENALTY_OVERRIDE:
        await this.loans.applyPenaltyOverride(
          actor,
          request.entityId,
          Number(payload.penaltyDailyPercent),
        );
        break;
      case ApprovalType.PENALTY_WAIVER:
        await this.payments.applyPenaltyWaiver(
          actor,
          String(payload.installmentId ?? request.entityId),
          Number(payload.amount),
        );
        break;
      case ApprovalType.INTEREST_WAIVER:
        await this.payments.applyInterestWaiver(
          actor,
          String(payload.installmentId ?? request.entityId),
          Number(payload.amount),
        );
        break;
      case ApprovalType.PAYMENT_REVERSAL:
        await this.payments.applyReversal(actor, request.entityId);
        break;
      case ApprovalType.NPA_MARK:
        await this.customers.executeNpaMark(actor, request.entityId, payload);
        break;
      case ApprovalType.NPA_CLEAR:
        await this.customers.executeNpaClear(actor, request.entityId);
        break;
      case ApprovalType.FORECLOSURE:
        await this.closures.applyForeclosure(
          actor,
          request.loanId ?? request.entityId,
          payload,
        );
        break;
      case ApprovalType.SETTLEMENT:
        await this.closures.applySettlement(
          actor,
          request.loanId ?? request.entityId,
          payload,
        );
        break;
      case ApprovalType.WRITE_OFF:
        await this.closures.applyWriteOff(
          actor,
          request.loanId ?? request.entityId,
          payload,
        );
        break;
      case ApprovalType.RESTRUCTURE:
        await this.restructure.applyRestructure(
          actor,
          request.loanId ?? request.entityId,
          payload,
        );
        break;
      case ApprovalType.OTHER:
        break;
      default:
        throw new BadRequestException(
          `Unsupported approval type: ${request.type}`,
        );
    }

    return this.prisma.approvalRequest.update({
      where: { id: request.id },
      data: { appliedAt: new Date() },
    });
  }
}
