import { Inject, Injectable } from "@nestjs/common";
import type { PaymentMethod } from "@prisma/client";
import { OutboxService } from "../../events/outbox.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ProjectionService } from "../../queues/processors/projection.service";
import {
  type InvoiceRefundedPayload,
  OUTBOX_EVENT_INVOICE_REFUNDED,
  OUTBOX_EVENT_PAYMENT_CONFIRMED,
  type PaymentConfirmedPayload,
} from "../../shared/outbox-events";
import type { DecryptedUser } from "../../users/user-crypto.service";
import {
  BillingService,
  type ConfirmInvoicePaymentInput,
} from "../billing.service";

@Injectable()
export class BillingCommandsService {
  constructor(
    @Inject(BillingService) private readonly billing: BillingService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OutboxService) private readonly outbox: OutboxService,
    @Inject(ProjectionService)
    private readonly projections: ProjectionService,
  ) {}

  async convertToQuarterly(actor: DecryptedUser, invoiceId: string) {
    return this.billing.convertToQuarterly(actor, invoiceId);
  }

  async markPaid(
    actor: DecryptedUser,
    id: string,
    input: {
      paymentMethod: PaymentMethod;
      referralDiscount?: number;
      studioDiscount?: number;
    },
  ) {
    const result = await this.billing.markPaid(actor, id, input);
    await this.emitPaymentConfirmed({
      invoiceId: result.id,
      studioId: result.studio.id,
      studentId: result.student.id,
      amount: String(result.amount),
    });
    return result;
  }

  async confirmPayment(
    id: string,
    actor: DecryptedUser,
    payment: ConfirmInvoicePaymentInput = {},
  ) {
    const result = await this.billing.confirmInvoicePayment(id, actor, payment);
    await this.emitPaymentConfirmed({
      invoiceId: result.id,
      studioId: result.studioId,
      studentId: result.studentId,
      amount: String(result.amount),
    });
    return result;
  }

  async refund(
    actor: DecryptedUser,
    id: string,
    options: { amount?: number; reason?: string } = {},
  ) {
    const result = await this.billing.refundInvoiceForStudio(
      actor,
      id,
      options,
    );
    if ((result.thisRefundAmount ?? 0) > 0) {
      await this.emitInvoiceRefunded({
        invoiceId: result.id,
        studioId: result.studioId,
        studentId: result.studentId,
        refundedAmount: String(result.thisRefundAmount),
      });
    }
    return result;
  }

  async createPaymentOrder(id: string, actor: DecryptedUser) {
    return this.billing.createInvoicePaymentOrder(id, actor);
  }

  async abandonPayment(id: string, actor: DecryptedUser) {
    return this.billing.abandonInvoicePayment(id, actor);
  }

  async familyCombine(
    actor: DecryptedUser,
    data: {
      studioId: string;
      purchaserUserId: string;
      invoiceIds: string[];
      familyDiscount: number;
    },
  ) {
    return this.billing.familyCombine(actor, data);
  }

  private async emitPaymentConfirmed(payload: PaymentConfirmedPayload) {
    await this.outbox.append(
      this.prisma,
      OUTBOX_EVENT_PAYMENT_CONFIRMED,
      payload,
      { studioId: payload.studioId },
    );
    await this.projections.refreshStudioRevenue(payload.studioId);
  }

  private async emitInvoiceRefunded(payload: InvoiceRefundedPayload) {
    await this.outbox.append(
      this.prisma,
      OUTBOX_EVENT_INVOICE_REFUNDED,
      payload,
      { studioId: payload.studioId },
    );
    await this.projections.refreshStudioRevenue(payload.studioId);
  }
}
