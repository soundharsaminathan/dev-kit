import { Badge } from "@dev-ui/components/badge";
import { useState } from "react";
import { FormInput } from "@/modules/ui/form-input";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./booking-review-panel.module.scss";
import type { StudioBooking } from "./types";

const STATUS_VARIANT: Record<
  string,
  "success" | "warning" | "danger" | "info" | undefined
> = {
  CONFIRMED: "success",
  COMPLETED: "info",
  PENDING: "warning",
  CANCELLED: "danger",
};

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultReviewWindow() {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);
  return {
    startsAt: toLocalInputValue(start),
    endsAt: toLocalInputValue(end),
  };
}

export function BookingReviewPanel({
  booking,
  isPending,
  onConfirm,
  onDecline,
}: {
  booking: StudioBooking;
  isPending: boolean;
  onConfirm: (times?: { startsAt: string; endsAt: string }) => void;
  onDecline: () => void;
}) {
  const defaults = defaultReviewWindow();
  const [startsAt, setStartsAt] = useState(defaults.startsAt);
  const [endsAt, setEndsAt] = useState(defaults.endsAt);

  const studentName = booking.student?.name ?? booking.studentId;
  const typeLabel = booking.type.replaceAll("_", " ");

  return (
    <div className={styles.body}>
      <div className={styles.block}>
        <p className={styles.blockLabel}>Status</p>
        <div className={styles.statusRow}>
          <Badge appearance="subtle" variant={STATUS_VARIANT[booking.status]}>
            {booking.status}
          </Badge>
        </div>
      </div>

      <div className={styles.block}>
        <p className={styles.blockLabel}>Request</p>
        <p className={styles.blockValue}>{typeLabel}</p>
      </div>

      {booking.batch?.name ? (
        <div className={styles.block}>
          <p className={styles.blockLabel}>Batch</p>
          <p className={styles.blockValue}>{booking.batch.name}</p>
        </div>
      ) : null}

      {booking.student?.email ? (
        <div className={styles.block}>
          <p className={styles.blockLabel}>Student</p>
          <p className={styles.blockValue}>
            {studentName}
            <br />
            {booking.student.email}
          </p>
        </div>
      ) : null}

      {booking.notes ? (
        <div className={styles.block}>
          <p className={styles.blockLabel}>Notes</p>
          <p className={styles.blockValue}>{booking.notes}</p>
        </div>
      ) : null}

      {booking.startsAt && booking.endsAt ? (
        <div className={styles.block}>
          <p className={styles.blockLabel}>Scheduled</p>
          <p className={styles.blockValue}>
            {new Date(booking.startsAt).toLocaleString()} –{" "}
            {new Date(booking.endsAt).toLocaleTimeString()}
          </p>
        </div>
      ) : null}

      {booking.status === "PENDING" ? (
        <div className={styles.review}>
          <FormInput
            label="Starts at"
            type="datetime-local"
            value={startsAt}
            onChange={setStartsAt}
          />
          <FormInput
            label="Ends at"
            type="datetime-local"
            value={endsAt}
            onChange={setEndsAt}
          />
          <div className={styles.reviewActions}>
            <TouchButton
              variant="primary"
              fullWidth
              isPending={isPending}
              onClick={() =>
                onConfirm({
                  startsAt: new Date(startsAt).toISOString(),
                  endsAt: new Date(endsAt).toISOString(),
                })
              }
            >
              Confirm with time
            </TouchButton>
            <TouchButton
              variant="default"
              fullWidth
              isPending={isPending}
              data-testid="booking-confirm"
              onClick={() => onConfirm()}
            >
              Confirm without time
            </TouchButton>
            <TouchButton
              variant="danger"
              fullWidth
              isPending={isPending}
              onClick={onDecline}
            >
              Decline
            </TouchButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { STATUS_VARIANT };
