# Loan-mate LMS — Functional Requirements (v1)

Staff-only multi-company NBFC loan management. Architecture follows classa (`apps/step-up` + `apps/step-up-api`): Vite + TanStack SPA and NestJS + Prisma API.

## Confirmed decisions (do not reopen)

### Organization & multi-tenancy

- Institution: NBFC. Architecture: multi-company.
- Customer belongs to **one company only**.
- Company has **multiple branches**.
- Company Owner / Company Admin: all branches in their company.
- Branch-level users: restricted by branch assignment.
- Customer may have **multiple active loans**.
- Historical / outstanding records retained.

### Customer identification

- Mobile uniqueness: **within company**.
- PAN uniqueness: **within company**.
- Customer number: **globally sequential**.
- Cannot delete customer while active (non-closed) loans exist.
- Blacklist stores a **reason**.

### Loan products

- Configurable products; defaults filled/confirmed at loan creation.
- Overrides allowed with **approval + audit**.
- No interest-rate slabs. No branch-specific products.
- Final approved values may differ from originally applied values.

### Interest & EMI

- Convention: **Actual/365 Fixed**. All days are working days. No holiday calendar / adjustments.
- Method: **reducing-balance equated EMI** (Q16).
- Frequencies: Weekly (7 days), Bi-Weekly (14 days), Monthly. No Quarterly.
- Rates may differ by payment frequency.
- Monthly first-EMI options:
  1. Exact day (clamp to last valid day; first EMI may be same month).
  2. Convert to 1st + partial interest deducted from disbursement.
  3. Convert to 1st, next month; ignore partial interest.
- Disbursement after scheduled EMI date allowed.
- First EMI may differ from subsequent; final EMI adjusted to clear.
- Schedule generated at **disbursement**.
- Post-disbursement rate change requires approval + audit.

### Payments

- Modes: Cash, UPI, Bank Transfer, NEFT, RTGS. **No cheque**.
- Staff-entered; no payment gateway in v1.
- Fields: payment date, amount, mode, reference, details, receipt.
- **Payment date only** (no separate value date).
- Backdated and future-dated payments **allowed**.
- No overpayment workflow (reject amount above total outstanding).
- Allocation: **Penalty → Interest → Principal**, oldest overdue EMI first; partial next EMI allowed.
- Partial EMI: penalty on **remaining unpaid** of that EMI only (Q17: simple daily % of remaining unpaid EMI, no compounding, no cap).

### Overdue & penalty

- Overdue starts **day after** due date.
- Grace and penalty behavior: company-configurable.
- Penalty continues indefinitely until payment; no cap.

### Advance payment

- Treatment selected on the **Advance Payment Form** (company/customer), not a single global rule.

### NPA

- **Deferred for v1** — no NPA status, workflow, or reports.

### Maker-checker & audit

- Maker-checker for: loan approval, product/default overrides, interest-rate changes, waivers, payment reversals, other financially significant changes.
- Immutable audit: who, what, old/new, datetime, approval/rejection, reason.

### v1 product scope

- Staff ops only (**no borrower portal**).
- Include: skeleton + customers + products + origination/approval + disbursement + EMI + collections (overdue/penalty).
- **Out of v1:** NPA, borrower login, foreclosure, settlement, restructuring, write-off, double-entry accounting, payment gateway, cheque, holiday calendar.

---

## Provisional v1 decisions (Q18–Q33)

These were frozen as documented defaults so implementation can proceed. Change only via explicit product decision.

| Q | Topic | v1 decision |
|---|---|---|
| Q18 | Disbursement | **Single release** (no tranches). |
| Q19 | Rate change after disbursement | **Regenerate remaining unpaid EMIs from next due date** at the new rate; paid installments unchanged. |
| Q20 | Backdated / future-dated payments | Backdate: **recompute penalty as-of payment date**. Future-dated: **apply immediately** (record uses payment date for allocation/overdue math). |
| Q21 | Grace | Grace **delays penalty accrual only**; overdue status still applies from day after due. |
| Q22 | Penalty rate source | **Company setting** (daily %), overridable on loan with approval. |
| Q23 | Advance Payment Form options | **Reduce principal** \| **Skip next EMI** \| **Park as advance balance**. Form requires explicit choice. |
| Q24 | Approval graph | **Single-level** maker-checker; **maker cannot approve own** request. |
| Q25 | Staff roles + branch | Roles: `SYSTEM_ADMIN`, `COMPANY_OWNER`, `COMPANY_ADMIN`, `BRANCH_MANAGER`, `LOAN_OFFICER`, `APPROVER`, `COLLECTION_OFFICER`. Branch-scoped roles: **one primary branch**. Owner/Admin: all branches. |
| Q26 | Loan statuses | `DRAFT` → `SUBMITTED` → `VERIFIED` → `APPROVED` \| `REJECTED` → `DISBURSED` → `ACTIVE` → `CLOSED`. |
| Q27 | Tenure unit | **Installment count** (`tenureInstallments`). |
| Q28 | Charges at disbursement | Optional **processing fee**; Option-2 partial interest **deducted from release amount**. |
| Q29 | Identifiers | Customer: `CUST-{padded global seq}`. Loan: `LN-{companySlug}-{padded company seq}`. |
| Q30 | KYC / co-borrower | Basic KYC fields on customer (name, mobile, PAN, address). **No co-borrower/guarantor** in v1. |
| Q31 | Waiver | **Penalty waiver only** in v1; always maker-checker. |
| Q32 | Payment reversal | **Full reversal only**; restores EMI + penalty state. |
| Q33 | Receipt numbering | **Per-company sequential** `RCPT-{padded}`. |

---

## Mapping: classa → loan-mate

| classa | loan-mate |
|---|---|
| Studio | Company |
| StudioBranch | Branch |
| User.studioId | User.companyId |
| `/admin` `/app` `/me` | `/admin` `/app` only |
| OWNER / STAFF / … | LMS roles above |
