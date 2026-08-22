import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useApi } from "@/lib/api-context";
import { Screen } from "@/modules/ui/screen";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import { ErrorState, SuccessState } from "@/modules/ui/states";
import { StickyCtaBar, TouchButton } from "@/modules/ui/touch-button";
import styles from "./checkout-page.module.scss";
import {
  formatPaiseAsInr,
  formatSeconds,
  openRazorpayCheckout,
  type PaymentOrderResponse,
  type RazorpaySuccessResponse,
  secondsLeft,
} from "./checkout-utils";

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
  const [remaining, setRemaining] = useState(600);
  const [expired, setExpired] = useState(false);
  const [paid, setPaid] = useState(false);
  const [amountLabel, setAmountLabel] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

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
    mutationFn: (payload?: RazorpaySuccessResponse) =>
      api.post<CheckoutBooking>(
        `/bookings/${bookingId}/confirm-payment`,
        payload ?? {},
      ),
    onSuccess: async (updated) => {
      setPaid(true);
      setPayError(null);
      queryClient.setQueryData(["bookings", bookingId], updated);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["bookings"] }),
        queryClient.invalidateQueries({ queryKey: ["batches"] }),
      ]);
    },
  });

  const startPayment = useMutation({
    mutationFn: async () => {
      setPayError(null);
      const order = await api.post<PaymentOrderResponse>(
        `/bookings/${bookingId}/create-payment-order`,
      );

      if (order.mode === "demo") {
        setAmountLabel("₹0.00 demo");
        await confirmPayment.mutateAsync(undefined);
        return;
      }

      setAmountLabel(formatPaiseAsInr(order.amount));
      await openRazorpayCheckout({
        order,
        description: bookingQuery.data?.batch?.name ?? "Booking payment",
        confirm: (response) => confirmPayment.mutateAsync(response),
      });
    },
    onError: (error: unknown) => {
      if (error instanceof Error && error.message === "Payment cancelled") {
        setPayError(null);
        return;
      }
      setPayError(error instanceof Error ? error.message : "Payment failed.");
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
          description="The payment window closed and your seat was released. Book again to get a fresh hold."
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

  const urgent = remaining <= 60;
  const isPaying = startPayment.isPending || confirmPayment.isPending;

  return (
    <>
      <Screen title="Secure checkout" showBack backTo="/me/book" paddedCta>
        <div className={styles.panel}>
          <div className={styles.brand}>
            <p className={styles.brandEyebrow}>Payment gateway</p>
            <h2 className={styles.brandTitle}>Razorpay (test)</h2>
            <p className={styles.brandNote}>
              Complete payment before the timer runs out. Your seat is held for
              10 minutes while checkout is open.
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
              <p className={styles.value}>{amountLabel ?? "₹1.00 test"}</p>
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

          {payError || confirmPayment.isError ? (
            <ErrorState
              description={
                payError ??
                (confirmPayment.error instanceof Error
                  ? confirmPayment.error.message
                  : "Payment failed.")
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
            data-testid="checkout-abandon"
            isDisabled={isPaying}
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
          isPending={isPaying}
          data-testid="checkout-pay"
          onClick={() => startPayment.mutate()}
        >
          Pay securely
        </TouchButton>
      </StickyCtaBar>
    </>
  );
}
