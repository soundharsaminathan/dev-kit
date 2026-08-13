export type ExpensePaymentMethod =
  | "CASH"
  | "BANK_TRANSFER"
  | "UPI"
  | "CARD"
  | "CHEQUE"
  | "OTHER";

export type ExpenseRecurrenceFrequency =
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "YEARLY";

export type ExpenseCategory = {
  id: string;
  studioId: string;
  name: string;
  icon: string | null;
  isDefault: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { expenses: number };
};

export type Expense = {
  id: string;
  studioId: string;
  branchId: string | null;
  amount: number;
  expenseDate: string;
  categoryId: string;
  vendor: string | null;
  paymentMethod: ExpensePaymentMethod | null;
  description: string | null;
  notes: string | null;
  receiptKey: string | null;
  receiptUrl: string | null;
  recurringExpenseId: string | null;
  createdById: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string; icon: string | null };
  recurringExpense?: {
    id: string;
    frequency: ExpenseRecurrenceFrequency;
    nextOccurrence: string;
  } | null;
};

export type RecurringExpense = {
  id: string;
  studioId: string;
  categoryId: string;
  amount: number;
  frequency: ExpenseRecurrenceFrequency;
  startDate: string;
  endDate: string | null;
  nextOccurrence: string;
  vendor: string | null;
  paymentMethod: ExpensePaymentMethod | null;
  description: string | null;
  notes: string | null;
  active: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string; icon: string | null };
};

export type ExpenseListResult = {
  items: Expense[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export type ExpenseSort = "date" | "amount" | "category" | "vendor";
export type ExpenseOrder = "asc" | "desc";

export type ExpenseListParams = {
  from?: string;
  to?: string;
  categoryId?: string;
  vendor?: string;
  paymentMethod?: ExpensePaymentMethod;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  sort?: ExpenseSort;
  order?: ExpenseOrder;
  page?: number;
  pageSize?: number;
};

export type DashboardData = {
  summaryCards: {
    thisMonth: number;
    thisYear: number;
    prevMonth: number;
    prevMonthDeltaPct: number | null;
    averageMonthly: number;
    largestCategory: {
      categoryId: string;
      categoryName: string;
      amount: number;
    } | null;
  };
  trend: {
    from: string;
    to: string;
    bucket: "day" | "week" | "month";
    series: Array<{
      start: string;
      end: string;
      amount: number;
      count: number;
    }>;
    comparison: {
      previousFrom: string;
      previousTo: string;
      amount: number;
      deltaPct: number | null;
    };
  };
  byCategory: Array<{
    categoryId: string;
    categoryName: string;
    icon: string | null;
    amount: number;
    percentage: number;
  }>;
  byPaymentMethod: Array<{ method: string; amount: number; count: number }>;
  recent: Expense[];
};

export type ReportsData = {
  from: string;
  to: string;
  totals: { amount: number; count: number };
  monthly: Array<{ month: string; total: number; count: number }>;
  byCategory: Array<{
    categoryId: string;
    categoryName: string;
    total: number;
    percentage: number;
    count: number;
    average: number;
  }>;
  byVendor: Array<{
    vendor: string;
    total: number;
    count: number;
    average: number;
  }>;
};

export type FinancialOverview = {
  from: string;
  to: string;
  revenue: number;
  expenses: number;
  net: number;
};

export const PAYMENT_METHOD_LABELS: Record<ExpensePaymentMethod, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  UPI: "UPI",
  CARD: "Card",
  CHEQUE: "Cheque",
  OTHER: "Other",
};

export const PAYMENT_METHOD_OPTIONS = Object.entries(PAYMENT_METHOD_LABELS).map(
  ([value, label]) => ({ value, label }),
);

export const FREQUENCY_LABELS: Record<ExpenseRecurrenceFrequency, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
};

export const FREQUENCY_OPTIONS = Object.entries(FREQUENCY_LABELS).map(
  ([value, label]) => ({ value, label }),
);

export function formatPrice(amount: number | string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

export function formatDateOnly(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function todayInputValue() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function dateInputToApiValue(value: string): string {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Choose an expense date.");
  }
  return parsed.toISOString().slice(0, 10);
}

export function monthStartInputValue(offsetMonths = 0) {
  const now = new Date();
  const month = String(now.getMonth() + 1 + offsetMonths).padStart(2, "0");
  const year = now.getFullYear();
  return `${year}-${month}-01`;
}
