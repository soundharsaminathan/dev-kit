export type PrintableInvoice = {
  id: string;
  amount: number;
  referralDiscount?: number | undefined;
  studioDiscount?: number | undefined;
  familyDiscount?: number | undefined;
  status: string;
  paymentMethod?: string | null | undefined;
  paidAt?: string | Date | null | undefined;
  studentName?: string | null | undefined;
  studioName?: string | null | undefined;
  subtotal?: number | undefined;
};

function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatMethod(method: string | null | undefined) {
  switch (method) {
    case "CASH":
      return "Cash";
    case "UPI_MANUAL":
      return "UPI";
    case "RAZORPAY":
      return "Online";
    default:
      return method ?? "—";
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function printInvoice(invoice: PrintableInvoice) {
  const referral = invoice.referralDiscount ?? 0;
  const studio = invoice.studioDiscount ?? 0;
  const family = invoice.familyDiscount ?? 0;
  const subtotal =
    invoice.subtotal ??
    Math.round((invoice.amount + referral + studio + family) * 100) / 100;
  const paidAt = invoice.paidAt
    ? new Date(invoice.paidAt).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

  const discountRows = [
    referral > 0
      ? `<tr><td>Referral discount</td><td>−${escapeHtml(formatInr(referral))}</td></tr>`
      : "",
    studio > 0
      ? `<tr><td>Studio discount</td><td>−${escapeHtml(formatInr(studio))}</td></tr>`
      : "",
    family > 0
      ? `<tr><td>Family discount</td><td>−${escapeHtml(formatInr(family))}</td></tr>`
      : "",
  ].join("");

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice ${escapeHtml(invoice.id)}</title>
  <style>
    body { font-family: system-ui, sans-serif; color: #111; margin: 32px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    p { margin: 0 0 8px; color: #444; }
    table { width: 100%; max-width: 420px; border-collapse: collapse; margin-top: 24px; }
    td { padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px; }
    td:last-child { text-align: right; }
    .total td { font-weight: 600; border-bottom: none; padding-top: 12px; }
    .meta { margin-top: 24px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <h1>${escapeHtml(invoice.studioName ?? "Step Up")}</h1>
  <p>Payment receipt</p>
  <p>Student: ${escapeHtml(invoice.studentName ?? "—")}</p>
  <table>
    <tr><td>Subtotal</td><td>${escapeHtml(formatInr(subtotal))}</td></tr>
    ${discountRows}
    <tr class="total"><td>Amount paid</td><td>${escapeHtml(formatInr(invoice.amount))}</td></tr>
    <tr><td>Method</td><td>${escapeHtml(formatMethod(invoice.paymentMethod))}</td></tr>
    <tr><td>Paid at</td><td>${escapeHtml(paidAt)}</td></tr>
  </table>
  <p class="meta">Invoice ${escapeHtml(invoice.id)} · ${escapeHtml(invoice.status)}</p>
  <script>
    window.addEventListener("load", () => {
      window.focus();
      window.print();
    });
  </script>
</body>
</html>`;

  const popup = window.open("", "_blank", "width=640,height=720");
  if (!popup) {
    return false;
  }
  popup.opener = null;
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  return true;
}

export function parseDiscountInput(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return Number.NaN;
  return Math.round(parsed * 100) / 100;
}
