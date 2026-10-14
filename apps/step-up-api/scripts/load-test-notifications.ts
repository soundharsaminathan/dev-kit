/**
 * Lightweight notification create/fan-out stress harness.
 * Usage (API running locally with AUTH_BYPASS):
 *   pnpm exec tsx scripts/load-test-notifications.ts
 */
const API = process.env.API_URL ?? "http://127.0.0.1:3000";
const SECRET = process.env.JOBS_SECRET ?? "";
const ITERATIONS = Number(process.env.LOAD_ITERATIONS ?? 200);

async function main() {
  const started = Date.now();
  let ok = 0;
  let failed = 0;

  for (let i = 0; i < ITERATIONS; i += 1) {
    try {
      const response = await fetch(`${API}/jobs/notifications/run-scheduled`, {
        method: "POST",
        headers: {
          "x-jobs-secret": SECRET,
        },
      });
      if (response.ok) {
        ok += 1;
      } else {
        failed += 1;
      }
    } catch {
      failed += 1;
    }
  }

  const elapsed = Date.now() - started;
  console.log(
    JSON.stringify(
      {
        iterations: ITERATIONS,
        ok,
        failed,
        elapsedMs: elapsed,
        perSecond: Number(((ok / elapsed) * 1000).toFixed(2)),
      },
      null,
      2,
    ),
  );
}

void main();
