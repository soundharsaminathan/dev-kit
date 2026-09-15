# loan-mate — overview

Staff-only multi-company LMS for NBFC loan operations. Mirrors classa’s Vite SPA + Nest API shape, without a borrower portal.

**In scope (v1):** companies/branches, customers, products, loan origination & maker-checker approval, disbursement + EMI schedule, collections (overdue/penalty, advance treatments).

**Out of scope:** NPA, borrower login, foreclosure/settlement, payment gateway, cheque, holiday calendar.

Teal staff UI (`#0d9488`), auth via API JWT (localStorage session), optional `AUTH_BYPASS` for local seed roles.
