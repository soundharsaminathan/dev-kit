import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
} from "@nestjs/common";
import { ApprovalsService } from "../approvals/approvals.service";
import type { AuthUser } from "../auth/current-user.decorator";
import { money, toNumber } from "../common/money";
import { ApprovalType, LoanStatus } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { trancheRejection } from "../schedules/domain/lms-rules";
import type {
  CollateralDto,
  GuarantorDto,
  LoanNpaDto,
  TrancheDto,
} from "./dto/loan.dto";
import { LoansService } from "./loans.service";

@Injectable()
export class LoanExtrasService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(forwardRef(() => LoansService))
    private readonly loans: LoansService,
    @Inject(forwardRef(() => ApprovalsService))
    private readonly approvals: ApprovalsService,
  ) {}

  async addCollateral(actor: AuthUser, loanId: string, dto: CollateralDto) {
    const loan = await this.loans.get(actor, loanId);
    if (
      loan.status === LoanStatus.CLOSED ||
      loan.status === LoanStatus.REJECTED
    ) {
      throw new BadRequestException("Cannot add collateral on a closed loan");
    }
    return this.prisma.loanCollateral.create({
      data: {
        loanId,
        collateralType: dto.collateralType,
        description: dto.description,
        ownerName: dto.ownerName,
        estimatedValue: money(dto.estimatedValue),
      },
    });
  }

  async addGuarantor(actor: AuthUser, loanId: string, dto: GuarantorDto) {
    const loan = await this.loans.get(actor, loanId);
    if (
      loan.status === LoanStatus.CLOSED ||
      loan.status === LoanStatus.REJECTED
    ) {
      throw new BadRequestException("Cannot add a guarantor on a closed loan");
    }
    return this.prisma.loanGuarantor.create({
      data: {
        loanId,
        name: dto.name,
        relationship: dto.relationship,
        mobile: dto.mobile,
        pan: dto.pan?.toUpperCase(),
        monthlyIncome:
          dto.monthlyIncome != null ? money(dto.monthlyIncome) : undefined,
        hasSigned: dto.hasSigned ?? false,
      },
    });
  }

  async addTranche(actor: AuthUser, loanId: string, dto: TrancheDto) {
    const loan = await this.loans.get(actor, loanId);
    if (
      loan.status !== LoanStatus.ACTIVE &&
      loan.status !== LoanStatus.DISBURSED
    ) {
      throw new BadRequestException("Tranches are recorded after disbursement");
    }
    const released = loan.tranches.reduce(
      (sum, t) => sum + toNumber(t.amount),
      0,
    );
    const rejection = trancheRejection(
      released,
      dto.amount,
      toNumber(loan.principal),
    );
    if (rejection) throw new BadRequestException(rejection);
    const number =
      loan.tranches.reduce((max, t) => Math.max(max, t.number), 0) + 1;
    return this.prisma.disbursementTranche.create({
      data: {
        loanId,
        number,
        amount: money(dto.amount),
        mode: dto.mode,
        reference: dto.reference,
        paidAt: new Date(dto.paidAt),
      },
    });
  }

  async requestNpa(actor: AuthUser, loanId: string, dto: LoanNpaDto) {
    const loan = await this.loans.get(actor, loanId);
    if (loan.npa) throw new BadRequestException("Loan is already NPA");
    if (
      loan.status !== LoanStatus.ACTIVE &&
      loan.status !== LoanStatus.DISBURSED
    ) {
      throw new BadRequestException("Only an active loan can be marked NPA");
    }
    return this.approvals.create(actor, {
      type: ApprovalType.LOAN_NPA_MARK,
      entityType: "Loan",
      entityId: loanId,
      loanId,
      payload: { category: dto.category },
      reason: dto.reason,
    });
  }

  async requestNpaClear(actor: AuthUser, loanId: string, reason?: string) {
    const loan = await this.loans.get(actor, loanId);
    if (!loan.npa) throw new BadRequestException("Loan is not NPA");
    return this.approvals.create(actor, {
      type: ApprovalType.LOAN_NPA_CLEAR,
      entityType: "Loan",
      entityId: loanId,
      loanId,
      payload: {},
      reason,
    });
  }
}
