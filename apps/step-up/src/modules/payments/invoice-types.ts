export type CoveredSeat = {
  studentId: string;
  seatRole: "ADULT" | "KID";
  batchId?: string;
};

export type Invoice = {
  id: string;
  studentId: string;
  amount: number;
  referralDiscount?: number;
  studioDiscount?: number;
  status: "PENDING" | "PAID" | "OVERDUE";
  paymentMethod?: "CASH" | "UPI_MANUAL" | "RAZORPAY" | null;
  paidAt?: string | null;
  kind: "FAMILY" | "INDIVIDUAL";
  student?: { name: string };
  familySummary?: {
    planName: string | null;
    adultCount: number | null;
    kidCount: number | null;
    coveredStudents: CoveredSeat[] | null;
  } | null;
  purchaseMeta?: {
    subscriptionId: string;
    purchaserUserId: string;
    coveredStudents: CoveredSeat[];
  } | null;
};

export type StudioFamily = {
  ownerId: string;
  ownerName: string;
  ownerRole: "OWNER" | "STAFF" | "TRAINER" | "STUDENT" | "PARENT";
  ownerPhotoUrl: string | null;
  members: Array<{
    id: string;
    name: string;
    photoUrl: string | null;
    seatRole: "ADULT" | "KID";
  }>;
};

export type ManualPaymentMethod = "CASH" | "UPI_MANUAL";

export function formatPrice(amount: number | string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount));
}
