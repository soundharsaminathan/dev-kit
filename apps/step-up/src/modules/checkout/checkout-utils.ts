export type PaymentOrderResponse =
  | { mode: "demo" }
  | {
      mode: "razorpay";
      keyId: string;
      orderId: string;
      amount: number;
      currency: string;
    };

export type RazorpaySuccessResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  handler: (response: RazorpaySuccessResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
};

type RazorpayFailureResponse = {
  error?: {
    code?: string;
    description?: string;
    reason?: string;
  };
};

type RazorpayInstance = {
  open: () => void;
  on: (
    event: "payment.failed",
    handler: (response: RazorpayFailureResponse) => void,
  ) => void;
};

declare global {
  interface Window {
    Razorpay: new (options: RazorpayCheckoutOptions) => RazorpayInstance;
  }
}

export function secondsLeft(expiresAt: string | null | undefined) {
  if (!expiresAt) return 0;
  return Math.max(
    0,
    Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000),
  );
}

export function formatSeconds(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatPaiseAsInr(paise: number) {
  return `₹${(paise / 100).toFixed(2)}`;
}

let checkoutScriptPromise: Promise<void> | null = null;

type RazorpayOrder = Extract<PaymentOrderResponse, { mode: "razorpay" }>;

export async function openRazorpayCheckout(options: {
  order: RazorpayOrder;
  description: string;
  confirm: (response: RazorpaySuccessResponse) => Promise<void>;
}): Promise<void> {
  await loadRazorpayCheckout();

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let handlerStarted = false;

    const finish = (run: () => void) => {
      if (settled) return;
      settled = true;
      run();
    };

    const rzp = new window.Razorpay({
      key: options.order.keyId,
      amount: options.order.amount,
      currency: options.order.currency,
      name: "Step Up",
      description: options.description,
      order_id: options.order.orderId,
      handler: (response) => {
        handlerStarted = true;
        options
          .confirm(response)
          .then(() => {
            finish(resolve);
          })
          .catch((error: unknown) => {
            finish(() => {
              reject(error);
            });
          });
      },
      modal: {
        ondismiss: () => {
          if (handlerStarted) return;
          finish(() => {
            reject(new Error("Payment cancelled"));
          });
        },
      },
    });

    rzp.on("payment.failed", (response) => {
      finish(() => {
        reject(
          new Error(
            response.error?.description ??
              response.error?.reason ??
              "Payment failed",
          ),
        );
      });
    });

    rzp.open();
  });
}

export function loadRazorpayCheckout(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay requires a browser"));
  }
  if (window.Razorpay) {
    return Promise.resolve();
  }
  if (checkoutScriptPromise) {
    return checkoutScriptPromise;
  }

  checkoutScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      checkoutScriptPromise = null;
      reject(new Error("Failed to load Razorpay Checkout"));
    };
    document.body.appendChild(script);
  });

  return checkoutScriptPromise;
}
