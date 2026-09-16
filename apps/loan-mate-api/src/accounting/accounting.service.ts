import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from "@nestjs/common";
import { money } from "../common/money";
import { JournalSourceType } from "../generated/prisma";
import { PrismaService } from "../prisma/prisma.service";
import { round2 } from "../schedules/domain/emi";
import { CHART_OF_ACCOUNTS_TEMPLATE } from "./chart-of-accounts";

export type JournalLineInput = {
  accountCode: string;
  debit: number;
  credit: number;
};

export type PostJournalInput = {
  companyId: string;
  entryDate: Date;
  memo?: string;
  sourceType: JournalSourceType;
  sourceId?: string;
  createdById?: string;
  lines: JournalLineInput[];
};

@Injectable()
export class AccountingService {
  private readonly logger = new Logger(AccountingService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async seedChartOfAccounts(companyId: string) {
    for (const row of CHART_OF_ACCOUNTS_TEMPLATE) {
      await this.prisma.account.upsert({
        where: { companyId_code: { companyId, code: row.code } },
        create: {
          companyId,
          code: row.code,
          name: row.name,
          type: row.type,
        },
        update: { name: row.name, type: row.type, active: true },
      });
    }
  }

  async listAccounts(companyId: string) {
    return this.prisma.account.findMany({
      where: { companyId, active: true },
      orderBy: { code: "asc" },
    });
  }

  async listJournals(companyId: string, from?: Date, to?: Date) {
    return this.prisma.journalEntry.findMany({
      where: {
        companyId,
        ...(from || to
          ? {
              entryDate: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      include: { lines: { include: { account: true } } },
      orderBy: { entryDate: "desc" },
      take: 500,
    });
  }

  async postJournal(input: PostJournalInput) {
    const lines = input.lines.filter(
      (l) => round2(l.debit) > 0 || round2(l.credit) > 0,
    );
    if (lines.length === 0) return null;

    let debitTotal = 0;
    let creditTotal = 0;
    for (const line of lines) {
      debitTotal = round2(debitTotal + line.debit);
      creditTotal = round2(creditTotal + line.credit);
    }
    if (Math.abs(debitTotal - creditTotal) > 0.01) {
      throw new BadRequestException("Journal entry is not balanced");
    }

    const codes = [...new Set(lines.map((l) => l.accountCode))];
    const accounts = await this.prisma.account.findMany({
      where: { companyId: input.companyId, code: { in: codes }, active: true },
    });
    const byCode = new Map(accounts.map((a) => [a.code, a.id]));
    const missing = codes.filter((c) => !byCode.has(c));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Missing chart accounts: ${missing.join(", ")}`,
      );
    }

    return this.prisma.journalEntry.create({
      data: {
        companyId: input.companyId,
        entryDate: input.entryDate,
        memo: input.memo,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        createdById: input.createdById,
        lines: {
          create: lines.map((l) => ({
            accountId: byCode.get(l.accountCode)!,
            debit: money(l.debit),
            credit: money(l.credit),
          })),
        },
      },
      include: { lines: true },
    });
  }

  /** Best-effort journal posting; logs and skips when CoA is incomplete. */
  async postJournalBestEffort(input: PostJournalInput) {
    try {
      return await this.postJournal(input);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Skipping journal (${input.sourceType}): ${msg}`);
      return null;
    }
  }

  async postDisbursement(params: {
    companyId: string;
    loanId: string;
    entryDate: Date;
    principal: number;
    netDisbursement: number;
    processingFee: number;
    partialInterestDeducted: number;
    createdById?: string;
  }) {
    const lines: JournalLineInput[] = [
      { accountCode: "1100", debit: params.principal, credit: 0 },
      { accountCode: "1000", debit: 0, credit: params.netDisbursement },
    ];
    if (params.processingFee > 0) {
      lines.push({
        accountCode: "4100",
        debit: 0,
        credit: params.processingFee,
      });
    }
    if (params.partialInterestDeducted > 0) {
      lines.push({
        accountCode: "4000",
        debit: 0,
        credit: params.partialInterestDeducted,
      });
    }
    return this.postJournalBestEffort({
      companyId: params.companyId,
      entryDate: params.entryDate,
      memo: "Loan disbursement",
      sourceType: JournalSourceType.DISBURSEMENT,
      sourceId: params.loanId,
      createdById: params.createdById,
      lines,
    });
  }

  async postPayment(params: {
    companyId: string;
    paymentId: string;
    entryDate: Date;
    amount: number;
    principal: number;
    interest: number;
    penalty: number;
    advanceToLiability?: number;
    createdById?: string;
  }) {
    const lines: JournalLineInput[] = [
      { accountCode: "1000", debit: params.amount, credit: 0 },
    ];
    if (params.principal > 0) {
      lines.push({
        accountCode: "1100",
        debit: 0,
        credit: params.principal,
      });
    }
    if (params.interest > 0) {
      lines.push({
        accountCode: "4000",
        debit: 0,
        credit: params.interest,
      });
    }
    if (params.penalty > 0) {
      lines.push({
        accountCode: "4200",
        debit: 0,
        credit: params.penalty,
      });
    }
    if (params.advanceToLiability && params.advanceToLiability > 0) {
      lines.push({
        accountCode: "2000",
        debit: 0,
        credit: params.advanceToLiability,
      });
    }
    return this.postJournalBestEffort({
      companyId: params.companyId,
      entryDate: params.entryDate,
      memo: "Loan payment",
      sourceType: JournalSourceType.PAYMENT,
      sourceId: params.paymentId,
      createdById: params.createdById,
      lines,
    });
  }

  async postWaiver(params: {
    companyId: string;
    installmentId: string;
    entryDate: Date;
    interestWaived: number;
    penaltyWaived: number;
    createdById?: string;
  }) {
    const lines: JournalLineInput[] = [];
    const total = round2(params.interestWaived + params.penaltyWaived);
    if (total <= 0) return null;
    lines.push({ accountCode: "5100", debit: total, credit: 0 });
    if (params.interestWaived > 0) {
      lines.push({
        accountCode: "4000",
        debit: 0,
        credit: params.interestWaived,
      });
    }
    if (params.penaltyWaived > 0) {
      lines.push({
        accountCode: "4200",
        debit: 0,
        credit: params.penaltyWaived,
      });
    }
    return this.postJournalBestEffort({
      companyId: params.companyId,
      entryDate: params.entryDate,
      memo: "Interest/penalty waiver",
      sourceType: JournalSourceType.WAIVER,
      sourceId: params.installmentId,
      createdById: params.createdById,
      lines,
    });
  }

  async postWriteOff(params: {
    companyId: string;
    loanId: string;
    entryDate: Date;
    principal: number;
    interest: number;
    penalty: number;
    createdById?: string;
  }) {
    const total = round2(params.principal + params.interest + params.penalty);
    if (total <= 0) return null;
    return this.postJournalBestEffort({
      companyId: params.companyId,
      entryDate: params.entryDate,
      memo: "Loan write-off",
      sourceType: JournalSourceType.WRITE_OFF,
      sourceId: params.loanId,
      createdById: params.createdById,
      lines: [
        { accountCode: "5000", debit: total, credit: 0 },
        { accountCode: "1100", debit: 0, credit: params.principal },
        ...(params.interest > 0
          ? [{ accountCode: "4000", debit: 0, credit: params.interest }]
          : []),
        ...(params.penalty > 0
          ? [{ accountCode: "4200", debit: 0, credit: params.penalty }]
          : []),
      ],
    });
  }

  async postForeclosureOrSettlement(params: {
    companyId: string;
    loanId: string;
    entryDate: Date;
    sourceType:
      | typeof JournalSourceType.FORECLOSURE
      | typeof JournalSourceType.SETTLEMENT;
    principal: number;
    interest: number;
    penalty: number;
    foreclosureCharge?: number;
    cashCollected?: number;
    createdById?: string;
  }) {
    const lines: JournalLineInput[] = [];
    const outstanding = round2(
      params.principal + params.interest + params.penalty,
    );
    const charge = round2(params.foreclosureCharge ?? 0);
    const cash = round2(params.cashCollected ?? 0);
    const expense = round2(Math.max(0, outstanding + charge - cash));

    if (cash > 0) {
      lines.push({ accountCode: "1000", debit: cash, credit: 0 });
    }
    if (params.principal > 0) {
      lines.push({
        accountCode: "1100",
        debit: 0,
        credit: params.principal,
      });
    }
    if (params.interest > 0) {
      lines.push({
        accountCode: "4000",
        debit: 0,
        credit: params.interest,
      });
    }
    if (params.penalty > 0) {
      lines.push({
        accountCode: "4200",
        debit: 0,
        credit: params.penalty,
      });
    }
    if (charge > 0) {
      lines.push({ accountCode: "4100", debit: 0, credit: charge });
    }
    if (expense > 0) {
      lines.push({ accountCode: "5000", debit: expense, credit: 0 });
    }

    return this.postJournalBestEffort({
      companyId: params.companyId,
      entryDate: params.entryDate,
      memo:
        params.sourceType === JournalSourceType.FORECLOSURE
          ? "Loan foreclosure"
          : "Loan settlement",
      sourceType: params.sourceType,
      sourceId: params.loanId,
      createdById: params.createdById,
      lines,
    });
  }
}
