export const OUTBOX_EVENT_NOTIFICATION_CREATED = "notification.created";
export const OUTBOX_EVENT_BATCH_CAPACITY_CHANGED = "batch.capacity_changed";
export const OUTBOX_EVENT_PAYMENT_CONFIRMED = "payment.confirmed";
export const OUTBOX_EVENT_INVOICE_REFUNDED = "invoice.refunded";
export const OUTBOX_EVENT_DAILY_JOBS_REQUESTED = "jobs.daily_requested";

export const PROJECTION_QUEUE = "projection";
export const DAILY_JOBS_QUEUE = "daily-jobs";

export type BatchCapacityChangedPayload = {
  batchId: string;
  studioId: string;
};

export type PaymentConfirmedPayload = {
  invoiceId: string;
  studioId: string;
  studentId: string;
  amount: string;
};

export type InvoiceRefundedPayload = {
  invoiceId: string;
  studioId: string;
  studentId: string;
  refundedAmount: string;
};
