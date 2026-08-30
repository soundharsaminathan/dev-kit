export type PrintableInvoice = {
  id: string;
  amount: number;
  referralDiscount?: number | undefined;
  studioDiscount?: number | undefined;
  familyDiscount?: number | undefined;
  status: string;
  paymentMethod?: string | null | undefined;
  paidAt?: string | Date | null | undefined;
  /** Billing period month; falls back to paidAt when omitted. */
  billMonth?: string | Date | null | undefined;
  studentName?: string | null | undefined;
  studioName?: string | null | undefined;
  studioLogoUrl?: string | null | undefined;
  gstNumber?: string | null | undefined;
  studioAddress?: string | null | undefined;
  gstPercent?: number | undefined;
  subtotal?: number | undefined;
};

export function formatBillMonth(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date
    .toLocaleString("en-IN", { month: "long", year: "numeric" })
    .replace(/\s+/g, "");
}

export function invoiceFileName(invoice: {
  studentName?: string | null | undefined;
  billMonth?: string | Date | null | undefined;
  paidAt?: string | Date | null | undefined;
}): string {
  const rawName = invoice.studentName?.trim() || "invoice";
  const username = rawName
    .replace(/\s+/g, "_")
    .replace(/[^\w.-]+/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  const monthSource = invoice.billMonth ?? invoice.paidAt ?? new Date();
  const billMonth =
    monthSource instanceof Date || typeof monthSource === "string"
      ? formatBillMonth(monthSource)
      : formatBillMonth(new Date());
  return `${username || "invoice"}_${billMonth}`;
}

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
  const gstPercent = invoice.gstPercent ?? 0;
  const gstAmount =
    gstPercent > 0
      ? Math.round(invoice.amount * (gstPercent / 100) * 100) / 100
      : 0;
  const subtotal =
    invoice.subtotal ??
    Math.round((invoice.amount + referral + studio + family) * 100) / 100;
  const paidAt = invoice.paidAt
    ? new Date(invoice.paidAt).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

  const studioName = invoice.studioName?.trim() || "classa";
  const gstNumber = invoice.gstNumber?.trim() || "";
  const studioAddress = invoice.studioAddress?.trim() || "";
  const logoUrl = invoice.studioLogoUrl?.trim() || "";

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
    gstPercent > 0
      ? `<tr><td>GST (${escapeHtml(String(gstPercent))}%)</td><td>${escapeHtml(formatInr(gstAmount))}</td></tr>`
      : "",
  ].join("");

  const logoHtml = logoUrl
    ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="" />`
    : `<div class="logo-fallback" aria-hidden="true">${escapeHtml(studioName.slice(0, 1).toUpperCase())}</div>`;

  const addressHtml = studioAddress
    ? `<p class="address">${escapeHtml(studioAddress)}</p>`
    : "";
  const gstHtml = gstNumber
    ? `<p class="gst">GSTIN: ${escapeHtml(gstNumber)}</p>`
    : "";

  const fileName = invoiceFileName(invoice);

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(fileName)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      color: #141418;
      margin: 0;
      padding: 36px 40px;
      background: #fff;
    }
    .sheet { max-width: 480px; margin: 0 auto; }
    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
      padding-bottom: 18px;
      border-bottom: 2px solid #141418;
    }
    .logo {
      width: 56px;
      height: 56px;
      object-fit: cover;
      border-radius: 12px;
      border: 1px solid #e6e6ea;
      background: #f6f6f8;
      flex-shrink: 0;
    }
    .logo-fallback {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      background: #141418;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .brand-text { min-width: 0; }
    h1 {
      font-size: 22px;
      margin: 0 0 4px;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }
    .tagline {
      margin: 0;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #6b6b76;
    }
    .address, .gst {
      margin: 4px 0 0;
      font-size: 12px;
      color: #5a5a66;
      line-height: 1.4;
    }
    .gst { font-variant-numeric: tabular-nums; letter-spacing: 0.02em; }
    .section {
      margin-top: 22px;
    }
    .section-label {
      margin: 0 0 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #8a8a96;
    }
    .student {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    td {
      padding: 10px 0;
      border-bottom: 1px solid #ececf0;
      font-size: 14px;
      vertical-align: baseline;
    }
    td:last-child {
      text-align: right;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .total td {
      font-weight: 700;
      font-size: 15px;
      border-bottom: none;
      padding-top: 14px;
      border-top: 2px solid #141418;
    }
    .meta {
      margin-top: 28px;
      padding-top: 14px;
      border-top: 1px dashed #d8d8e0;
      font-size: 11px;
      color: #7a7a86;
      line-height: 1.5;
    }
    @media print {
      body { padding: 16px; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <header class="brand">
      ${logoHtml}
      <div class="brand-text">
        <h1>${escapeHtml(studioName)}</h1>
        <p class="tagline">Payment receipt</p>
        ${addressHtml}
        ${gstHtml}
      </div>
    </header>
    <section class="section">
      <p class="section-label">Billed to</p>
      <p class="student">${escapeHtml(invoice.studentName ?? "—")}</p>
    </section>
    <section class="section">
      <p class="section-label">Payment</p>
      <table>
        <tr><td>Subtotal</td><td>${escapeHtml(formatInr(subtotal))}</td></tr>
        ${discountRows}
        <tr class="total"><td>Amount paid</td><td>${escapeHtml(formatInr(invoice.amount))}</td></tr>
        <tr><td>Method</td><td>${escapeHtml(formatMethod(invoice.paymentMethod))}</td></tr>
        <tr><td>Paid at</td><td>${escapeHtml(paidAt)}</td></tr>
      </table>
    </section>
    <p class="meta">Invoice ${escapeHtml(invoice.id)} · ${escapeHtml(invoice.status)}</p>
  </div>
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
