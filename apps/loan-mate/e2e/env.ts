/**
 * Dedicated database so flow tests never touch a developer's `loan_mate` data.
 * Override with LOAN_MATE_E2E_DATABASE_URL when local Postgres credentials differ.
 */
export const e2eDatabaseUrl =
  process.env.LOAN_MATE_E2E_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5432/loan_mate_e2e?schema=public";

export const apiPort = Number(process.env.LOAN_MATE_API_PORT ?? 3011);

export const apiBaseUrl =
  process.env.LOAN_MATE_API_URL ?? `http://127.0.0.1:${apiPort}`;
