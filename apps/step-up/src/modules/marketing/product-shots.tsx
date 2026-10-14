import type { ReactNode } from "react";
import { AttendanceMock } from "./mocks/attendance";
import { BatchesMock } from "./mocks/batches";
import { CertificateMock } from "./mocks/certificate";
import { DashboardMock } from "./mocks/dashboard";
import { InvoiceMock } from "./mocks/invoice";
import { LeadsMock } from "./mocks/leads";
import { PaymentAnalyticsMock } from "./mocks/payment-analytics";
import { ScheduleMock } from "./mocks/schedule";
import { StudentProfileMock } from "./mocks/student-profile";
import { ProductShot } from "./product-shot";

/**
 * Product screenshot manifest.
 * Drop PNGs into `public/marketing/` and set `src` here to replace mocks.
 * `ratio` is the desktop frame. Mobile always uses a phone (9 / 16) layout.
 */
export type ShotId =
  | "dashboard"
  | "attendance"
  | "batches"
  | "studentProfile"
  | "leads"
  | "invoice"
  | "paymentAnalytics"
  | "schedule"
  | "certificate";

type ShotDef = {
  id: ShotId;
  /** Absolute path under public/, e.g. "/marketing/dashboard.png" */
  src?: string | undefined;
  alt: string;
  ratio: string;
  mock: () => ReactNode;
};

export const PRODUCT_SHOTS: Record<ShotId, ShotDef> = {
  dashboard: {
    id: "dashboard",
    alt: "classa studio dashboard with today's classes, attendance, and payments",
    ratio: "16 / 10",
    mock: () => <DashboardMock />,
  },
  attendance: {
    id: "attendance",
    alt: "classa attendance screen for a class session",
    ratio: "16 / 10",
    mock: () => <AttendanceMock />,
  },
  batches: {
    id: "batches",
    alt: "classa batch management with schedules and enrollment",
    ratio: "16 / 10",
    mock: () => <BatchesMock />,
  },
  studentProfile: {
    id: "studentProfile",
    alt: "classa student profile with enrollments and membership",
    ratio: "16 / 10",
    mock: () => <StudentProfileMock />,
  },
  leads: {
    id: "leads",
    alt: "classa trial caller with new leads and booked trials",
    ratio: "16 / 10",
    mock: () => <LeadsMock />,
  },
  invoice: {
    id: "invoice",
    alt: "classa invoices and payment status list",
    ratio: "16 / 10",
    mock: () => <InvoiceMock />,
  },
  paymentAnalytics: {
    id: "paymentAnalytics",
    alt: "classa payment analytics with collections and revenue trends",
    ratio: "16 / 10",
    mock: () => <PaymentAnalyticsMock />,
  },
  schedule: {
    id: "schedule",
    alt: "classa studio schedule calendar",
    ratio: "16 / 10",
    mock: () => <ScheduleMock />,
  },
  certificate: {
    id: "certificate",
    alt: "classa certificate designer",
    ratio: "16 / 10",
    mock: () => <CertificateMock />,
  },
};

type ShotProps = {
  id: ShotId;
  className?: string | undefined;
  browserChrome?: boolean | undefined;
  ratio?: string | undefined;
  active?: boolean | undefined;
};

/** Renders a product shot from the manifest — mock today, image when `src` is set. */
export function Shot({
  id,
  className,
  browserChrome,
  ratio,
  active,
}: ShotProps) {
  const def = PRODUCT_SHOTS[id];
  return (
    <ProductShot
      src={def.src}
      alt={def.alt}
      ratio={ratio ?? def.ratio}
      browserChrome={browserChrome}
      className={className}
    >
      {id === "leads" ? <LeadsMock active={active} /> : def.mock()}
    </ProductShot>
  );
}
