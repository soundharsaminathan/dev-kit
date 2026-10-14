import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import type { AuthUser } from "../auth/current-user.decorator";
import { toNumber } from "../common/money";
import { branchWhere, requireCompany } from "../common/tenancy";
import {
  ApprovalStatus,
  InstallmentStatus,
  LoanStatus,
} from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReportsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private scope(actor: AuthUser) {
    const companyId = requireCompany(actor);
    return { companyId, ...branchWhere(actor) };
  }

  private maybeCsv(rows: Record<string, unknown>[], format?: string) {
    if (format !== "csv") return rows;
    if (rows.length === 0) return "";
    const keys = Object.keys(rows[0]!);
    const lines = [
      keys.join(","),
      ...rows.map((r) =>
        keys
          .map((k) => {
            const v = r[k];
            const s = v == null ? "" : String(v);
            return s.includes(",") ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(","),
      ),
    ];
    return lines.join("\n");
  }

  async portfolio(actor: AuthUser, format?: string) {
    const where = this.scope(actor);
    const loans = await this.prisma.loan.findMany({
      where: {
        companyId: where.companyId,
        ...(where.branchId ? { branchId: where.branchId } : {}),
        status: {
          in: [LoanStatus.DISBURSED, LoanStatus.ACTIVE, LoanStatus.WRITTEN_OFF],
        },
      },
      include: {
        branch: true,
        product: true,
        installments: true,
      },
    });

    const buckets = new Map<string, { count: number; outstanding: number }>();
    for (const loan of loans) {
      const key = `${loan.branch.code}|${loan.product.code}|${loan.status}`;
      let outstanding = 0;
      for (const inst of loan.installments) {
        if (inst.status === InstallmentStatus.PAID) continue;
        outstanding +=
          Math.max(
            0,
            toNumber(inst.principalDue) - toNumber(inst.paidPrincipal),
          ) +
          Math.max(
            0,
            toNumber(inst.interestDue) - toNumber(inst.paidInterest),
          ) +
          Math.max(0, toNumber(inst.penaltyDue) - toNumber(inst.paidPenalty));
      }
      const prev = buckets.get(key) ?? { count: 0, outstanding: 0 };
      buckets.set(key, {
        count: prev.count + 1,
        outstanding: prev.outstanding + outstanding,
      });
    }

    const rows = [...buckets.entries()].map(([key, v]) => {
      const [branchCode, productCode, status] = key.split("|");
      return {
        branchCode,
        productCode,
        status,
        loanCount: v.count,
        outstanding: Math.round(v.outstanding * 100) / 100,
      };
    });
    return this.maybeCsv(rows, format);
  }

  async collections(
    actor: AuthUser,
    from: string,
    to: string,
    format?: string,
  ) {
    if (!from || !to) {
      throw new BadRequestException("from and to query params required");
    }
    const where = this.scope(actor);
    const payments = await this.prisma.payment.findMany({
      where: {
        companyId: where.companyId,
        reversed: false,
        paymentDate: {
          gte: new Date(from),
          lte: new Date(to),
        },
        loan: where.branchId ? { branchId: where.branchId } : undefined,
      },
      include: {
        loan: { include: { branch: true, customer: true } },
        allocations: true,
      },
      orderBy: { paymentDate: "asc" },
    });

    const rows = payments.map((p) => {
      let principal = 0;
      let interest = 0;
      let penalty = 0;
      for (const a of p.allocations) {
        principal += toNumber(a.principal);
        interest += toNumber(a.interest);
        penalty += toNumber(a.penalty);
      }
      return {
        receiptNumber: p.receiptNumber,
        paymentDate: p.paymentDate.toISOString().slice(0, 10),
        loanNumber: p.loan.loanNumber,
        branchCode: p.loan.branch.code,
        customerName: p.loan.customer.name,
        amount: toNumber(p.amount),
        principal,
        interest,
        penalty,
        mode: p.mode,
      };
    });
    return this.maybeCsv(rows, format);
  }

  async overdue(actor: AuthUser, format?: string) {
    const where = this.scope(actor);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const installments = await this.prisma.installment.findMany({
      where: {
        status: { in: [InstallmentStatus.OVERDUE, InstallmentStatus.PARTIAL] },
        loan: {
          companyId: where.companyId,
          ...(where.branchId ? { branchId: where.branchId } : {}),
          status: { in: [LoanStatus.ACTIVE, LoanStatus.DISBURSED] },
        },
      },
      include: {
        loan: { include: { customer: true, branch: true } },
      },
      orderBy: { dueDate: "asc" },
    });

    const rows = installments.map((inst) => {
      const due = new Date(inst.dueDate);
      due.setHours(0, 0, 0, 0);
      const dpd =
        today.getTime() > due.getTime()
          ? Math.floor(
              (today.getTime() - due.getTime()) / (24 * 60 * 60 * 1000),
            )
          : 0;
      const remaining =
        Math.max(
          0,
          toNumber(inst.principalDue) - toNumber(inst.paidPrincipal),
        ) +
        Math.max(0, toNumber(inst.interestDue) - toNumber(inst.paidInterest)) +
        Math.max(0, toNumber(inst.penaltyDue) - toNumber(inst.paidPenalty));
      return {
        loanNumber: inst.loan.loanNumber,
        installmentNumber: inst.number,
        dueDate: inst.dueDate.toISOString().slice(0, 10),
        dpd,
        remaining: Math.round(remaining * 100) / 100,
        customerName: inst.loan.customer.name,
        branchCode: inst.loan.branch.code,
      };
    });
    return this.maybeCsv(rows, format);
  }

  async npa(actor: AuthUser, format?: string) {
    const companyId = requireCompany(actor);
    const customers = await this.prisma.customer.findMany({
      where: { companyId, npa: true },
      orderBy: { npaMarkedAt: "desc" },
    });
    const rows = customers.map((c) => ({
      customerNumber: c.customerNumber,
      name: c.name,
      mobile: c.mobile,
      npaReason: c.npaReason,
      npaMarkedAt: c.npaMarkedAt?.toISOString() ?? null,
      sourceLoanId: c.npaSourceLoanId,
    }));
    return this.maybeCsv(rows, format);
  }

  async disbursements(
    actor: AuthUser,
    from?: string,
    to?: string,
    format?: string,
  ) {
    const where = this.scope(actor);
    const loans = await this.prisma.loan.findMany({
      where: {
        companyId: where.companyId,
        ...(where.branchId ? { branchId: where.branchId } : {}),
        disbursementDate: {
          not: null,
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        },
      },
      include: { branch: true, customer: true, product: true },
      orderBy: { disbursementDate: "desc" },
    });
    const rows = loans.map((l) => ({
      loanNumber: l.loanNumber,
      disbursementDate: l.disbursementDate?.toISOString().slice(0, 10),
      principal: toNumber(l.principal),
      netDisbursement: l.netDisbursement ? toNumber(l.netDisbursement) : null,
      branchCode: l.branch.code,
      customerName: l.customer.name,
      productCode: l.product.code,
      status: l.status,
    }));
    return this.maybeCsv(rows, format);
  }

  async receipts(actor: AuthUser, from?: string, to?: string, format?: string) {
    const where = this.scope(actor);
    const payments = await this.prisma.payment.findMany({
      where: {
        companyId: where.companyId,
        reversed: false,
        ...(from || to
          ? {
              paymentDate: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
        loan: where.branchId ? { branchId: where.branchId } : undefined,
      },
      include: { loan: { include: { customer: true } } },
      orderBy: { paymentDate: "desc" },
    });
    const rows = payments.map((p) => ({
      receiptNumber: p.receiptNumber,
      paymentDate: p.paymentDate.toISOString().slice(0, 10),
      amount: toNumber(p.amount),
      mode: p.mode,
      loanNumber: p.loan.loanNumber,
      customerName: p.loan.customer.name,
    }));
    return this.maybeCsv(rows, format);
  }

  async closures(actor: AuthUser, format?: string) {
    const where = this.scope(actor);
    const rows = await this.prisma.loanClosure.findMany({
      where: {
        loan: {
          companyId: where.companyId,
          ...(where.branchId ? { branchId: where.branchId } : {}),
        },
      },
      include: { loan: { include: { branch: true, customer: true } } },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    const mapped = rows.map((c) => ({
      loanNumber: c.loan.loanNumber,
      type: c.type,
      asOfDate: c.asOfDate.toISOString().slice(0, 10),
      principalOutstanding: toNumber(c.principalOutstanding),
      interestAccrued: toNumber(c.interestAccrued),
      penaltyOutstanding: toNumber(c.penaltyOutstanding),
      settlementAmount: c.settlementAmount
        ? toNumber(c.settlementAmount)
        : null,
      amountWrittenOff: toNumber(c.amountWrittenOff),
      branchCode: c.loan.branch.code,
      customerName: c.loan.customer.name,
    }));
    return this.maybeCsv(mapped, format);
  }

  async approvals(actor: AuthUser, format?: string) {
    const companyId = requireCompany(actor);
    const pending = await this.prisma.approvalRequest.findMany({
      where: { companyId, status: ApprovalStatus.PENDING },
      include: { maker: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });
    const now = Date.now();
    const rows = pending.map((a) => ({
      id: a.id,
      type: a.type,
      entityType: a.entityType,
      entityId: a.entityId,
      loanId: a.loanId,
      createdAt: a.createdAt.toISOString(),
      ageHours: Math.round((now - a.createdAt.getTime()) / (60 * 60 * 1000)),
      makerName: a.maker.name,
      reason: a.reason,
    }));
    return this.maybeCsv(rows, format);
  }
}
