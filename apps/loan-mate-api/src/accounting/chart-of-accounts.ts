import { AccountType } from "../generated/prisma/client";

export type CoaTemplateRow = {
  code: string;
  name: string;
  type: AccountType;
};

export const CHART_OF_ACCOUNTS_TEMPLATE: CoaTemplateRow[] = [
  { code: "1000", name: "Cash", type: AccountType.ASSET },
  { code: "1100", name: "Loans Receivable", type: AccountType.ASSET },
  { code: "1200", name: "Interest Receivable", type: AccountType.ASSET },
  { code: "2000", name: "Unearned/Advances", type: AccountType.LIABILITY },
  { code: "4000", name: "Interest Income", type: AccountType.INCOME },
  { code: "4100", name: "Fee Income", type: AccountType.INCOME },
  { code: "4200", name: "Penalty Income", type: AccountType.INCOME },
  { code: "5000", name: "Write-off Expense", type: AccountType.EXPENSE },
  { code: "5100", name: "Waiver Expense", type: AccountType.EXPENSE },
];
