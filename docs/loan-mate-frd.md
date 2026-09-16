# Loan-mate LMS — Functional Requirements

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
- Staff-entered; no payment gateway.
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

- **Manual, customer-level** (Q35–Q36). Staff marks/clears NPA; no date/DPD automatic movement.
- NPA blocks **new origination** until cleared. Existing loans stay collectible.
- Independent of blacklist (Q44): either flag blocks new loans; collections continue for both.

### Maker-checker & audit

- Single-level maker-checker (Q24/Q37); maker cannot approve own request.
- Checker approve **applies** the payload immediately (Q41).
- Immutable audit: who, what, old/new, datetime, approval/rejection, reason.

### Product scope

- Staff ops only (**no borrower portal**).
- **Still out:** borrower portal, payment gateway, cheque, holiday calendar, automatic DPD→NPA, multi-level approval.

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
| Q26 | Loan statuses | `DRAFT` → `SUBMITTED` → `VERIFIED` → `APPROVED` \| `REJECTED` → `DISBURSED` → `ACTIVE` → `CLOSED` / `WRITTEN_OFF`. |
| Q27 | Tenure unit | **Installment count** (`tenureInstallments`). |
| Q28 | Charges at disbursement | Optional **processing fee**; Option-2 partial interest **deducted from release amount**. |
| Q29 | Identifiers | Customer: `CUST-{padded global seq}`. Loan: `LN-{companySlug}-{padded company seq}`. |
| Q30 | KYC / co-borrower | Basic KYC fields on customer (name, mobile, PAN, address). **No co-borrower/guarantor**. |
| Q31 | Waiver | **Penalty waiver** in v1; extended in Q40. |
| Q32 | Payment reversal | **Full reversal only**; restores EMI + penalty state. |
| Q33 | Receipt numbering | **Per-company sequential** `RCPT-{padded}`. |

---

## Next-phase decisions (Q34–Q72)

Locked Q34–Q37 in product session. Q38–Q72 frozen as provisional defaults (same rule as Q18–Q33) so full remaining LMS can ship. Change only via explicit product decision.

| Q | Topic | Decision |
|---|---|---|
| Q34 | Next phase scope | **Full remaining LMS**: v1.1 completeness + close-out + restructuring + documents/KYC + double-entry accounting + reports + notifications. |
| Q35 | NPA meaning | **Manual staff mark** — no automatic DPD/date movement. |
| Q36 | NPA effect | **Customer-level** — blocks new origination until cleared; existing loans remain collectible. |
| Q37 | Approval graph | Keep **Q24** single-level for all financially significant actions. |
| Q38 | Receipt artifact | **Printable/PDF receipt stored as a document**. |
| Q39 | Multi-loan payment | **One payment → one loan** (keep v1). Staff posts per loan. |
| Q40 | Waivers | **Penalty + interest** waiver (maker-checker). No principal/charges waiver this phase. |
| Q41 | Checker approve | Approve **applies immediately** (one step). |
| Q42 | DPD display | Show **DPD** on loan/installment (no auto NPA). |
| Q43 | Where to mark NPA | **Either** customer or loan screen; both set customer NPA (`npaSourceLoanId` when from loan). |
| Q44 | Blacklist vs NPA | **Independent** flags; either blocks new loans; collections continue for both. |
| Q45 | Clearing NPA | Maker-checker `NPA_CLEAR` + reason; any eligible checker (not maker). |
| Q46 | Foreclosure payoff | Principal + **interest accrued to foreclosure date** on remaining principal + unpaid penalty − waivers. |
| Q47 | Foreclosure charges | Company **% of outstanding principal** (setting). |
| Q48 | Foreclosure status | `CLOSED` + `closureType = FORECLOSED`. |
| Q49 | Partial foreclosure | **Full payoff only**. |
| Q50 | Settlement discount | Negotiated lump sum may discount **principal**; difference written off on approval. |
| Q51 | Settlement status | `CLOSED` + `closureType = SETTLED`. |
| Q52 | Write-off scope | Write off **entire** remaining balance only. |
| Q53 | After write-off | Status `WRITTEN_OFF`; keep **recovery** queue (payments still allowed). |
| Q54 | Restructuring axes | **Tenure + rate + EMI amount** on remaining unpaid installments (paid frozen like Q19). |
| Q55 | Moratorium | **N/A** (Q54 is B — no moratorium this phase). |
| Q56 | Restructure eligibility | Company setting for **max count**; NPA customer **may** restructure existing loans. |
| Q57 | Verification | Required checklist (KYC docs present, PAN, address) before verify. |
| Q58 | Disbursement tranches | Keep **single release** (Q18). |
| Q59 | Disbursement instrument | Staff records **mode + reference** only. |
| Q60 | Bookkeeping | **Double-entry**; chart of accounts **cloned per company** from system template. |
| Q61 | GST on fee | **No GST** this phase. |
| Q62 | Period close | **None** this phase (reversing entries only). |
| Q63 | Document set | Customer KYC (photo ID, PAN, address) + loan agreement/sanction + **stored payment receipt PDFs**. |
| Q64 | Storage | Private object storage (**classa R2 pattern**). |
| Q65 | Co-borrower | Keep **none**. |
| Q66 | Notification channels | **In-app inbox + email**. |
| Q67 | Notification events | Due reminder, overdue start, payment recorded, approval pending, NPA marked/cleared, disbursed, loan closed. |
| Q68 | Reports | Portfolio outstanding; collections vs due; overdue/DPD aging; manual NPA list; disbursement register; receipt register; foreclosure/settlement/write-off register; approval pending/aging. Export: **CSV**. |
| Q69 | Permissions | Keep **role-only** matrix (Q25). |
| Q70 | Branch assignment | Keep **one primary branch** for branch-scoped roles. |
| Q71 | Audit UI | Filterable viewer + **CSV export**. |
| Q72 | Approval types | `LOAN_APPROVAL`, `PRODUCT_OVERRIDE`, `RATE_CHANGE`, `PENALTY_WAIVER`, `INTEREST_WAIVER`, `PAYMENT_REVERSAL`, `NPA_MARK`, `NPA_CLEAR`, `FORECLOSURE`, `SETTLEMENT`, `WRITE_OFF`, `RESTRUCTURE`. |

---

## Mapping: classa → loan-mate

| classa | loan-mate |
|---|---|
| Studio | Company |
| StudioBranch | Branch |
| User.studioId | User.companyId |
| `/admin` `/app` `/me` | `/admin` `/app` only |
| OWNER / STAFF / … | LMS roles above |
