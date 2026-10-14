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

type CheckoutInvoice = {
  id: string;
  status: string;
  amount: number;
  paymentHoldExpiresAt?: string | null;
  batch?: { id: string; name: string } | null;
};

function formatRupees(amount: number) {
  return `₹${amount.toFixed(2)}`;
}

export function InvoiceCheckoutPage() {
  const { invoiceId } = useParams({ strict: false }) as { invoiceId: string };
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [remaining, setRemaining] = useState(600);
  const [expired, setExpired] = useState(false);
  const [paid, setPaid] = useState(false);
  const [amountLabel, setAmountLabel] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  const invoiceQuery = useQuery({
    queryKey: ["billing", invoiceId],
    queryFn: () => api.get<CheckoutInvoice>(`/billing/${invoiceId}`),
  });

  useEffect(() => {
    const expiresAt = invoiceQuery.data?.paymentHoldExpiresAt;
    if (!expiresAt) return;

    const tick = () => {
      const left = secondsLeft(expiresAt);
      setRemaining(left);
      if (left <= 0) setExpired(true);
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [invoiceQuery.data?.paymentHoldExpiresAt]);

  useEffect(() => {
    if (!expired || paid) return;
    if (invoiceQuery.data?.status !== "PENDING") return;
    void api.post(`/billing/${invoiceId}/abandon-payment`).catch(() => {});
  }, [expired, paid, invoiceId, api, invoiceQuery.data?.status]);

  const confirmPayment = useMutation({
    mutationFn: (payload?: RazorpaySuccessResponse) =>
      api.post<CheckoutInvoice>(
        `/billing/${invoiceId}/confirm-payment`,
        payload ?? {},
      ),
    onSuccess: async (updated) => {
      setPaid(true);
      setPayError(null);
      queryClient.setQueryData(["billing", invoiceId], updated);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["billing"] }),
        queryClient.invalidateQueries({ queryKey: ["batches"] }),
        queryClient.invalidateQueries({ queryKey: ["memberships"] }),
        queryClient.invalidateQueries({ queryKey: ["invoices"] }),
      ]);
    },
  });

  const startPayment = useMutation({
    mutationFn: async () => {
      setPayError(null);
      const order = await api.post<PaymentOrderResponse>(
        `/billing/${invoiceId}/create-payment-order`,
      );

      if (order.mode === "demo") {
        setAmountLabel(
          invoiceQuery.data ? formatRupees(invoiceQuery.data.amount) : "Demo",
        );
        await confirmPayment.mutateAsync(undefined);
        return;
      }

      setAmountLabel(formatPaiseAsInr(order.amount));
      await openRazorpayCheckout({
        order,
        description: invoiceQuery.data?.batch?.name ?? "Plan payment",
        confirm: async (response) => {
          await confirmPayment.mutateAsync(response);
        },
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

  if (invoiceQuery.isLoading) {
    return (
      <Screen title="Checkout" showBack backTo="/me/book">
        <SkeletonBlock height="8rem" radius="var(--radius-2xl)" />
        <SkeletonBlock height="6rem" />
        <SkeletonBlock height="10rem" />
      </Screen>
    );
  }

  if (invoiceQuery.isError || !invoiceQuery.data) {
    return (
      <Screen title="Checkout" showBack backTo="/me/book">
        <ErrorState
          description={
            invoiceQuery.error instanceof Error
              ? invoiceQuery.error.message
              : "Checkout not found."
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

  const invoice = invoiceQuery.data;

  if (paid || invoice.status === "PAID") {
    return (
      <Screen title="Payment received" showBack backTo="/me/subscriptions">
        <SuccessState
          title="Payment complete"
          description="Your plan is active and you're enrolled in the class."
          action={
            <div className={styles.panel}>
              <TouchButton variant="primary" fullWidth>
                <Link to="/me/subscriptions">View my plans</Link>
              </TouchButton>
              <TouchButton
                variant="quiet"
                fullWidth
                onClick={() => {
                  if (invoice.batch?.id) {
                    void navigate({
                      to: "/me/batches/$id",
                      params: { id: invoice.batch.id },
                    });
                    return;
                  }
                  void navigate({ to: "/me/book" });
                }}
              >
                Back to class
              </TouchButton>
            </div>
          }
        />
      </Screen>
    );
  }

  if (expired || invoice.status !== "PENDING") {
    return (
      <Screen title="Payment expired" showBack backTo="/me/book">
        <ErrorState
          title="Hold expired"
          description="The payment window closed. Choose a plan again to get a fresh checkout."
          action={
            <TouchButton variant="primary" fullWidth>
              {invoice.batch?.id ? (
                <Link to="/me/batches/$id" params={{ id: invoice.batch.id }}>
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
              Complete payment before the timer runs out. Your plan checkout is
              held for 10 minutes.
            </p>
          </div>

          <div className={styles.summary}>
            <div className={styles.row}>
              <p className={styles.label}>Class</p>
              <p className={styles.value}>{invoice.batch?.name ?? "Plan"}</p>
            </div>
            <div className={styles.row}>
              <p className={styles.label}>Type</p>
              <p className={styles.value}>Plan purchase</p>
            </div>
            <div className={styles.row}>
              <p className={styles.label}>Amount</p>
              <p className={styles.value}>
                {amountLabel ?? formatRupees(invoice.amount)}
              </p>
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
              Checkout held until timer ends. Incomplete payments cancel
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
                .post(`/billing/${invoiceId}/abandon-payment`)
                .finally(() => {
                  if (invoice.batch?.id) {
                    void navigate({
                      to: "/me/batches/$id",
                      params: { id: invoice.batch.id },
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
