import type { Prisma } from "@prisma/client";
import type { OutboxService } from "../events/outbox.service";
import type { PrismaService } from "../prisma/prisma.service";
import { OUTBOX_EVENT_INVOICE_CREATED } from "../shared/outbox-events";

export function enqueueInvoiceCreated(
  outbox: OutboxService,
  tx: Prisma.TransactionClient | PrismaService,
  invoice: { id: string; studioId: string; studentId: string },
) {
  return outbox.append(
    tx,
    OUTBOX_EVENT_INVOICE_CREATED,
    {
      invoiceId: invoice.id,
      studioId: invoice.studioId,
      studentId: invoice.studentId,
    },
    { studioId: invoice.studioId },
  );
}
