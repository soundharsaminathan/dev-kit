import PDFDocument from "pdfkit";

export type InvoiceReceiptPdfInput = {
  invoiceId: string;
  studentName: string;
  studioName: string;
  studioAddress?: string | null;
  gstNumber?: string | null;
  subtotal: number;
  referralDiscount: number;
  studioDiscount: number;
  familyDiscount?: number;
  gstPercent?: number;
  gstAmount?: number;
  amountPaid: number;
  paymentMethod: string;
  paidAt: Date;
  status?: string;
  billMonth?: Date | string | null;
  billMonthKeys?: string[];
  billPeriodLabel?: string | null;
};

const INK = "#141418";
const MUTED = "#6b6b76";
const LABEL = "#8a8a96";
const RULE = "#ececf0";

export function invoiceReceiptFileName(input: {
  studentName?: string | null;
  billMonth?: Date | string | null;
  billMonthKeys?: string[];
  paidAt?: Date | string | null;
}): string {
  const rawName = input.studentName?.trim() || "invoice";
  const username = rawName
    .replace(/\s+/g, "_")
    .replace(/[^\w.-]+/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  const billMonth =
    input.billMonthKeys && input.billMonthKeys.length > 0
      ? formatBillPeriodFileName(input.billMonthKeys)
      : formatBillMonth(input.billMonth ?? input.paidAt ?? new Date());
  return `${username || "invoice"}_${billMonth}.pdf`;
}

export function coveredMonthKeys(input: {
  periodStart?: Date | null;
  periodEnd?: Date | null;
  billingCadence?: string | null;
}): string[] {
  if (!input.periodStart) return [];
  const start = input.periodStart;
  let count = 1;
  if (input.billingCadence === "QUARTERLY") {
    count = 3;
  } else if (input.periodEnd) {
    const end = input.periodEnd;
    count = Math.min(
      12,
      Math.max(
        1,
        (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
          (end.getUTCMonth() - start.getUTCMonth()) +
          1,
      ),
    );
  }
  return Array.from({ length: count }, (_, offset) => {
    const date = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + offset, 1),
    );
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

export function formatInvoicePeriodLabel(keys: string[]): string {
  const dates = keys
    .map((key) => monthDateFromKey(key))
    .filter((date): date is Date => date != null);
  if (dates.length === 0) return "";
  const formatMonthYear = (date: Date) =>
    date.toLocaleString("en-IN", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  if (dates.length === 1) {
    return formatMonthYear(dates[0]!);
  }
  const formatMonth = (date: Date) =>
    date.toLocaleString("en-IN", { month: "long", timeZone: "UTC" });
  const sameYear = dates.every(
    (date) => date.getUTCFullYear() === dates[0]!.getUTCFullYear(),
  );
  if (sameYear) {
    return `${dates.map(formatMonth).join(", ")} ${dates[0]!.getUTCFullYear()}`;
  }
  return dates.map(formatMonthYear).join(", ");
}

export async function buildInvoiceReceiptPdf(
  input: InvoiceReceiptPdfInput,
): Promise<Buffer> {
  const familyDiscount = input.familyDiscount ?? 0;
  const gstPercent = input.gstPercent ?? 0;
  const gstAmount = input.gstAmount ?? 0;
  const paidAtLabel = input.paidAt.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const periodLabel =
    input.billPeriodLabel?.trim() ||
    (input.billMonthKeys && input.billMonthKeys.length > 0
      ? formatInvoicePeriodLabel(input.billMonthKeys)
      : formatPeriodFromDate(input.billMonth ?? input.paidAt));
  const periodHeading =
    (input.billMonthKeys?.length ?? 0) > 1 ? "Invoice months" : "Invoice month";
  const studioName = input.studioName.trim() || "classa";
  const lines: Array<{ label: string; value: string; total?: boolean }> = [
    { label: "Subtotal", value: formatInr(input.subtotal) },
  ];
  if (input.referralDiscount > 0) {
    lines.push({
      label: "Referral discount",
      value: `−${formatInr(input.referralDiscount)}`,
    });
  }
  if (input.studioDiscount > 0) {
    lines.push({
      label: "Studio discount",
      value: `−${formatInr(input.studioDiscount)}`,
    });
  }
  if (familyDiscount > 0) {
    lines.push({
      label: "Family discount",
      value: `−${formatInr(familyDiscount)}`,
    });
  }
  if (gstPercent > 0) {
    lines.push({
      label: `GST (${gstPercent}%)`,
      value: formatInr(gstAmount),
    });
  }
  lines.push({
    label: "Amount paid",
    value: formatInr(input.amountPaid),
    total: true,
  });
  lines.push({
    label: "Method",
    value: formatPaymentMethod(input.paymentMethod),
  });
  lines.push({ label: "Paid at", value: paidAtLabel });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 48,
      info: {
        Title: invoiceReceiptFileName(input).replace(/\.pdf$/i, ""),
        Author: studioName,
      },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const left = doc.page.margins.left;
    const width =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    let y = doc.page.margins.top;

    doc.save();
    doc.roundedRect(left, y, 44, 44, 8).fill(INK);
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(18);
    doc.text(studioName.slice(0, 1).toUpperCase(), left, y + 12, {
      width: 44,
      align: "center",
    });
    doc.restore();

    const brandX = left + 56;
    const brandWidth = width - 56;
    doc.fillColor(INK).font("Helvetica-Bold").fontSize(18);
    doc.text(studioName, brandX, y + 2, { width: brandWidth });
    let brandY = doc.y;
    doc.fillColor(MUTED).font("Helvetica-Bold").fontSize(9);
    doc.text("PAYMENT RECEIPT", brandX, brandY + 2, { width: brandWidth });
    brandY = doc.y;
    const address = input.studioAddress?.trim();
    if (address) {
      doc.fillColor("#5a5a66").font("Helvetica").fontSize(9);
      doc.text(address, brandX, brandY + 2, { width: brandWidth });
      brandY = doc.y;
    }
    const gstNumber = input.gstNumber?.trim();
    if (gstNumber) {
      doc.fillColor("#5a5a66").font("Helvetica").fontSize(9);
      doc.text(`GSTIN: ${gstNumber}`, brandX, brandY + 2, {
        width: brandWidth,
      });
      brandY = doc.y;
    }

    y = Math.max(y + 44, brandY) + 16;
    strokeLine(doc, left, y, width, INK, 1.5);
    y += 22;

    y = drawSectionLabel(doc, left, y, "Billed to");
    doc.fillColor(INK).font("Helvetica-Bold").fontSize(13);
    doc.text(input.studentName.trim() || "—", left, y, { width });
    y = doc.y + 16;

    if (periodLabel) {
      y = drawSectionLabel(doc, left, y, periodHeading);
      doc.fillColor(INK).font("Helvetica-Bold").fontSize(13);
      doc.text(periodLabel, left, y, { width });
      y = doc.y + 16;
    }

    y = drawSectionLabel(doc, left, y, "Payment");
    for (const line of lines) {
      if (line.total) {
        strokeLine(doc, left, y, width, INK, 1.5);
        y += 10;
        doc.fillColor(INK).font("Helvetica-Bold").fontSize(12);
      } else {
        doc.fillColor(INK).font("Helvetica").fontSize(11);
      }
      const rowY = y;
      doc.text(line.label, left, rowY, { width: width * 0.55 });
      doc.text(line.value, left + width * 0.55, rowY, {
        width: width * 0.45,
        align: "right",
      });
      y = Math.max(doc.y, rowY + 16);
      if (!line.total) {
        strokeLine(doc, left, y, width, RULE, 0.5);
        y += 8;
      } else {
        y += 8;
      }
    }

    y += 18;
    doc.dash(3, { space: 3 });
    strokeLine(doc, left, y, width, "#d8d8e0", 0.75);
    doc.undash();
    y += 12;
    doc.fillColor("#7a7a86").font("Helvetica").fontSize(9);
    doc.text(
      `Invoice ${input.invoiceId} · ${input.status?.trim() || "PAID"}`,
      left,
      y,
      { width },
    );

    doc.end();
  });
}

function drawSectionLabel(
  doc: InstanceType<typeof PDFDocument>,
  left: number,
  y: number,
  label: string,
) {
  doc.fillColor(LABEL).font("Helvetica-Bold").fontSize(8);
  doc.text(label.toUpperCase(), left, y, { characterSpacing: 0.8 });
  return doc.y + 4;
}

function strokeLine(
  doc: InstanceType<typeof PDFDocument>,
  left: number,
  y: number,
  width: number,
  color: string,
  lineWidth: number,
) {
  doc
    .strokeColor(color)
    .lineWidth(lineWidth)
    .moveTo(left, y)
    .lineTo(left + width, y)
    .stroke();
}

function formatBillMonth(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date
    .toLocaleString("en-IN", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    })
    .replace(/\s+/g, "");
}

function formatBillPeriodFileName(keys: string[]): string {
  if (keys.length === 0) return formatBillMonth(new Date());
  const firstKey = keys[0]!;
  const lastKey = keys[keys.length - 1]!;
  const first = monthDateFromKey(firstKey);
  const last = monthDateFromKey(lastKey);
  if (!first || !last || keys.length === 1 || firstKey === lastKey) {
    return first ? formatBillMonth(first) : formatBillMonth(new Date());
  }
  const firstMonth = first.toLocaleString("en-IN", {
    month: "long",
    timeZone: "UTC",
  });
  const lastMonth = last.toLocaleString("en-IN", {
    month: "long",
    timeZone: "UTC",
  });
  if (first.getUTCFullYear() === last.getUTCFullYear()) {
    return `${firstMonth}-${lastMonth}${first.getUTCFullYear()}`;
  }
  return `${firstMonth}${first.getUTCFullYear()}-${lastMonth}${last.getUTCFullYear()}`;
}

function monthDateFromKey(key: string): Date | null {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return null;
  return new Date(Date.UTC(year, month - 1, 1));
}

function formatPeriodFromDate(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatPaymentMethod(method: string) {
  switch (method) {
    case "CASH":
      return "Cash";
    case "UPI_MANUAL":
      return "UPI";
    case "RAZORPAY":
      return "Online";
    default:
      return method;
  }
}
