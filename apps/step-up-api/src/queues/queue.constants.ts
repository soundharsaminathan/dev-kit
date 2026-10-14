export const NOTIFICATION_DELIVER_QUEUE = "notification-deliver";
export const NOTIFICATION_PUSH_QUEUE = "notification-push";
export const NOTIFICATION_DIGEST_QUEUE = "notification-digest";
export const NOTIFICATION_SCHEDULED_QUEUE = "notification-scheduled";
export const NOTIFICATION_RETENTION_QUEUE = "notification-retention";
export const PROJECTION_QUEUE = "projection";
export const DAILY_JOBS_QUEUE = "daily-jobs";

export {
  OUTBOX_EVENT_NOTIFICATION_CREATED,
  OUTBOX_EVENT_BATCH_CAPACITY_CHANGED,
  OUTBOX_EVENT_PAYMENT_CONFIRMED,
  OUTBOX_EVENT_INVOICE_REFUNDED,
  OUTBOX_EVENT_DAILY_JOBS_REQUESTED,
} from "../shared/outbox-events";
