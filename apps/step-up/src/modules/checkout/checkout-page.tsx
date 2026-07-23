import { Icon } from "@dev-ui/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useApi } from "@/lib/api-context";
import { Screen } from "@/modules/ui/screen";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import { ErrorState, SuccessState } from "@/modules/ui/states";
import { StickyCtaBar, TouchButton } from "@/modules/ui/touch-button";
import styles from "./checkout-page.module.scss";
import { formatSeconds, type PayMethod, secondsLeft } from "./checkout-utils";

type CheckoutBooking = {
  id: string;
  type: string;
  status: string;
  notes?: string | null;
  paymentHoldExpiresAt?: string | null;
  batch?: { id: string; name: string } | null;
};
export function CheckoutPage() {
  const { bookingId } = useParams({ strict: false }) as { bookingId: string };
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [method, setMethod] = useState<PayMethod>("upi");
  const [remaining, setRemaining] = useState(30);
  const [expired, setExpired] = useState(false);
  const [paid, setPaid] = useState(false);

  const bookingQuery = useQuery({
    queryKey: ["bookings", bookingId],
    queryFn: () => api.get<CheckoutBooking>(`/bookings/${bookingId}`),
  });

  useEffect(() => {
    const expiresAt = bookingQuery.data?.paymentHoldExpiresAt;
    if (!expiresAt) return;

    const tick = () => {
      const left = secondsLeft(expiresAt);
      setRemaining(left);
      if (left <= 0) setExpired(true);
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [bookingQuery.data?.paymentHoldExpiresAt]);

  useEffect(() => {
    if (!expired || paid) return;
    if (bookingQuery.data?.status !== "AWAITING_PAYMENT") return;
    void api.post(`/bookings/${bookingId}/abandon-payment`).catch(() => {});
  }, [expired, paid, bookingId, api, bookingQuery.data?.status]);

  const confirmPayment = useMutation({
    mutationFn: () =>
      api.post<CheckoutBooking>(`/bookings/${bookingId}/confirm-payment`),
    onSuccess: async () => {
      setPaid(true);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["bookings"] }),
        queryClient.invalidateQueries({ queryKey: ["batches"] }),
      ]);
    },
  });

  if (bookingQuery.isLoading) {
    return (
      <Screen title="Checkout" showBack backTo="/me/book">
        <SkeletonBlock height="8rem" radius="var(--radius-2xl)" />
        <SkeletonBlock height="6rem" />
        <SkeletonBlock height="10rem" />
      </Screen>
    );
  }

  if (bookingQuery.isError || !bookingQuery.data) {
    return (
      <Screen title="Checkout" showBack backTo="/me/book">
        <ErrorState
          description={
            bookingQuery.error instanceof Error
              ? bookingQuery.error.message
              : "Booking not found."
          }
          action={
            <TouchButton variant="primary" fullWidth>
              <Link to="/me/book">Back to discover</Link>
            </TouchButton>
          }
        />
      </Screen>
    );
  }

  const booking = bookingQuery.data;

  if (paid || booking.status === "PENDING") {
    return (
      <Screen title="Payment received" showBack backTo="/me/bookings">
        <SuccessState
          title="Payment complete"
          description="Your seat hold is confirmed. The studio will review your booking request next."
          action={
            <div className={styles.panel}>
              <TouchButton variant="primary" fullWidth>
                <Link to="/me/bookings">View my bookings</Link>
              </TouchButton>
              <TouchButton
                variant="quiet"
                fullWidth
                onClick={() => void navigate({ to: "/me/book" })}
              >
                Keep browsing
              </TouchButton>
            </div>
          }
        />
      </Screen>
    );
  }

  if (
    expired ||
    booking.status === "CANCELLED" ||
    booking.status !== "AWAITING_PAYMENT"
  ) {
    return (
      <Screen title="Payment expired" showBack backTo="/me/book">
        <ErrorState
          title="Hold expired"
          description="The 30-second payment window closed and your seat was released. Book again to get a fresh hold."
          action={
            <TouchButton variant="primary" fullWidth>
              {booking.batch?.id ? (
                <Link to="/me/batches/$id" params={{ id: booking.batch.id }}>
                  Try again
                </Link>
              ) : (
                <Link to="/me/book">Try again</Link>
              )}
            </TouchButton>
          }
        />
      </Screen>
    );
  }

  const urgent = remaining <= 10;

  return (
    <>
      <Screen title="Secure checkout" showBack backTo="/me/book" paddedCta>
        <div className={styles.panel}>
          <div className={styles.brand}>
            <p className={styles.brandEyebrow}>Payment gateway preview</p>
            <h2 className={styles.brandTitle}>Razorpay (demo)</h2>
            <p className={styles.brandNote}>
              Live Razorpay checkout is planned. This demo holds your seat for
              30 seconds — complete payment before the timer runs out.
            </p>
          </div>

          <div className={styles.summary}>
            <div className={styles.row}>
              <p className={styles.label}>Class</p>
              <p className={styles.value}>{booking.batch?.name ?? "Booking"}</p>
            </div>
            <div className={styles.row}>
              <p className={styles.label}>Type</p>
              <p className={styles.value}>
                {booking.type.replaceAll("_", " ")}
              </p>
            </div>
            <div className={styles.row}>
              <p className={styles.label}>Amount</p>
              <p className={styles.value}>₹0.00 demo</p>
            </div>
          </div>

          <div className={styles.timerWrap}>
            <p
              className={styles.timer}
              data-urgent={urgent ? "true" : undefined}
              aria-live="polite"
            >
              {formatSeconds(remaining)}
            </p>
            <p className={styles.timerLabel}>
              Seat held until timer ends. Incomplete payments cancel
              automatically.
            </p>
          </div>

          <div className={styles.methods}>
            {(
              [
                {
                  id: "upi" as const,
                  title: "UPI",
                  hint: "GPay, PhonePe, Paytm",
                  icon: "sparkles" as const,
                },
                {
                  id: "card" as const,
                  title: "Card",
                  hint: "Visa, Mastercard, RuPay",
                  icon: "credit-card" as const,
                },
                {
                  id: "netbanking" as const,
                  title: "Netbanking",
                  hint: "All major banks",
                  icon: "building" as const,
                },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                className={styles.method}
                data-selected={method === item.id ? "true" : undefined}
                onClick={() => setMethod(item.id)}
              >
                <span className={styles.methodIcon} aria-hidden>
                  <Icon name={item.icon} />
                </span>
                <span className={styles.methodText}>
                  <span className={styles.methodTitle}>{item.title}</span>
                  <span className={styles.methodHint}>{item.hint}</span>
                </span>
              </button>
            ))}
          </div>

          {confirmPayment.isError ? (
            <ErrorState
              description={
                confirmPayment.error instanceof Error
                  ? confirmPayment.error.message
                  : "Payment failed."
              }
            />
          ) : null}
        </div>
      </Screen>

      <StickyCtaBar
        secondary={
          <TouchButton
            variant="quiet"
            fullWidth
            onClick={() => {
              void api
                .post(`/bookings/${bookingId}/abandon-payment`)
                .finally(() => {
                  if (booking.batch?.id) {
                    void navigate({
                      to: "/me/batches/$id",
                      params: { id: booking.batch.id },
                    });
                    return;
                  }
                  void navigate({ to: "/me/book" });
                });
            }}
          >
            Cancel
          </TouchButton>
        }
      >
        <TouchButton
          variant="primary"
          fullWidth
          isDisabled={remaining <= 0}
          isPending={confirmPayment.isPending}
          onClick={() => confirmPayment.mutate()}
        >
          Pay securely
        </TouchButton>
      </StickyCtaBar>
    </>
  );
}
