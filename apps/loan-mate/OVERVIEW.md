# loan-mate — overview

Staff-only multi-company LMS for NBFC loan operations. Mirrors classa’s Vite SPA + Nest API shape, without a borrower portal.

**In scope (v1 + next phase):** companies/branches, customers, products, loan origination & maker-checker approval, disbursement + EMI schedule, collections (overdue/penalty, advance treatments), manual customer NPA, documents/KYC, foreclosure/settlement/write-off, restructuring, double-entry accounting, reports, notifications, audit viewer.

**Out of scope:** borrower login, payment gateway, cheque, holiday calendar, automatic DPD→NPA, multi-level approval.

Teal staff UI (`#0d9488`), auth via API JWT (localStorage session), optional `AUTH_BYPASS` for local seed roles.
