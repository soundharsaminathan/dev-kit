import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test as base, expect, type Page } from "@playwright/test";
import {
  batchCreateBody,
  canJoinPostpaidNow,
  isScheduleConflict,
  markableSessionId,
  scheduleJsonFor,
} from "../fixtures/billing-calendar";
import {
  apiBaseUrl,
  homePathForRole,
  SMOKE,
  type SmokeRole,
  smokePassword,
  webBaseUrl,
} from "./smoke-seed";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const authDir = path.join(dirname, ".auth");

const tokenCache = new Map<SmokeRole, { token: string; expiresAt: number }>();

export function authFile(role: SmokeRole) {
  return path.join(authDir, `${role.toLowerCase()}.json`);
}

export async function waitForAppReady(page: Page) {
  const readyTimeout = 60_000;
  // Deployed smoke has no VITE_AUTH_BYPASS; login keeps #boot-public until
  // interaction. Wait for the dismiss hook to arm, then nudge — an early click
  // is a no-op and the 30s safety timeout exhausts the 5m auth setup budget.
  const bootPublic = page.locator("#boot-public");
  if ((await bootPublic.count()) > 0) {
    await expect
      .poll(
        async () => {
          if ((await bootPublic.count()) === 0) return "gone";
          const armed = await page.evaluate(() =>
            document.documentElement.hasAttribute("data-boot-public"),
          );
          if (!armed) return "pending";
          await page
            .locator("body")
            .click({ position: { x: 2, y: 2 }, force: true })
            .catch(() => undefined);
          return (await bootPublic.count()) === 0 ? "gone" : "armed";
        },
        { timeout: readyTimeout, intervals: [100, 250, 500] },
      )
      .toBe("gone");
  }
  await expect(
    page.locator("#boot-splash, [data-boot-loader], #boot-public"),
  ).toHaveCount(0, {
    timeout: readyTimeout,
  });
  await expect
    .poll(
      async () => {
        return (
          (await page.getByRole("heading").count()) +
          (await page.getByRole("button").count()) +
          (await page.getByRole("link").count()) +
          (await page.getByRole("textbox").count())
        );
      },
      { timeout: readyTimeout },
    )
    .toBeGreaterThan(0);
}

export async function waitForApiReady(request: {
  get: (url: string) => Promise<{ ok: () => boolean; status: () => number }>;
}) {
  const api = apiBaseUrl();
  await expect
    .poll(
      async () => {
        try {
          const health = await request.get(`${api}/health`);
          return health.ok() ? "ok" : `health:${health.status()}`;
        } catch (error) {
          return `error:${String(error).slice(0, 160)}`;
        }
      },
      {
        timeout: 180_000,
        intervals: [1_000, 2_000, 5_000],
        message: `API not ready at ${api}`,
      },
    )
    .toBe("ok");
}

export async function waitForWebReady(request: {
  get: (url: string) => Promise<{ ok: () => boolean }>;
}) {
  const web = webBaseUrl();
  await expect
    .poll(
      async () => {
        try {
          const res = await request.get(web);
          return res.ok() ? "ok" : "down";
        } catch {
          return "down";
        }
      },
      {
        timeout: 60_000,
        intervals: [1_000, 2_000, 5_000],
        message: `Web not ready at ${web}`,
      },
    )
    .toBe("ok");
}

/** Mint a Firebase ID token via Identity Toolkit REST (email/password). */
export async function bearerFor(role: SmokeRole): Promise<string> {
  const cached = tokenCache.get(role);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }

  const apiKey =
    process.env.STEP_UP_FIREBASE_API_KEY ?? process.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "STEP_UP_FIREBASE_API_KEY (or VITE_FIREBASE_API_KEY) is required",
    );
  }

  const user = SMOKE.users[role];
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        password: smokePassword(),
        returnSecureToken: true,
      }),
    },
  );
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `Firebase sign-in failed for ${role}: ${response.status} ${text}`,
    );
  }
  const data = JSON.parse(text) as {
    idToken: string;
    expiresIn?: string;
  };
  const expiresInMs = Number(data.expiresIn ?? "3600") * 1000;
  tokenCache.set(role, {
    token: data.idToken,
    expiresAt: Date.now() + expiresInMs,
  });
  return data.idToken;
}

export async function apiRequest<T>(
  role: SmokeRole,
  pathName: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await bearerFor(role);
  const response = await fetch(`${apiBaseUrl()}${pathName}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!response.ok) {
    throw new Error(
      `API ${init.method ?? "GET"} ${pathName} failed: ${response.status} ${text}`,
    );
  }
  return data as T;
}

export function unwrapPage<T>(data: T[] | { items: T[] }): T[] {
  return Array.isArray(data) ? data : data.items;
}

export async function gotoAuthed(
  page: Page,
  role: SmokeRole,
  pathName?: string,
) {
  const target = pathName ?? homePathForRole(role);
  try {
    await page.goto(target, { waitUntil: "domcontentloaded" });
  } catch (error) {
    if (!String(error).includes("ERR_ABORTED")) {
      throw error;
    }
  }
  await waitForAppReady(page);
  await expect(page).not.toHaveURL(/\/login/);
}

export async function waitForApiResponse(
  page: Page,
  match: {
    method?: string;
    pathIncludes: string;
  },
) {
  return page.waitForResponse((response) => {
    const url = response.url();
    const method = response.request().method();
    if (!url.includes(match.pathIncludes)) return false;
    if (match.method && method !== match.method) return false;
    return true;
  });
}

export class SmokeDataCleanup {
  private readonly students: string[] = [];
  private readonly batches: string[] = [];
  private readonly subscriptions: string[] = [];
  private readonly certificates: string[] = [];
  private readonly contests: string[] = [];

  trackStudent(id: string) {
    this.students.push(id);
    return id;
  }

  trackBatch(id: string) {
    this.batches.push(id);
    return id;
  }

  trackSubscription(id: string) {
    this.subscriptions.push(id);
    return id;
  }

  trackCertificate(id: string) {
    this.certificates.push(id);
    return id;
  }

  trackContest(id: string) {
    this.contests.push(id);
    return id;
  }

  async dispose() {
    const studioId = SMOKE.studioId;
    for (const studentId of this.students.splice(0)) {
      await apiRequest(
        "OWNER",
        `/users/studio/${studioId}/students/${studentId}`,
        { method: "DELETE" },
      ).catch(() => undefined);
    }
    for (const batchId of this.batches.splice(0)) {
      await apiRequest("STAFF", `/batches/${batchId}`, {
        method: "DELETE",
      }).catch(() => undefined);
    }
    for (const subId of this.subscriptions.splice(0)) {
      await apiRequest("STAFF", `/subscriptions/${subId}`, {
        method: "DELETE",
      }).catch(() => undefined);
    }
    for (const certId of this.certificates.splice(0)) {
      await apiRequest("STAFF", `/certificate-templates/${certId}`, {
        method: "DELETE",
      }).catch(() => undefined);
    }
    for (const contestId of this.contests.splice(0)) {
      await apiRequest("STAFF", `/contests/${contestId}`, {
        method: "DELETE",
      }).catch(() => undefined);
    }
  }
}

export async function createCalendarBatch(
  cleanup: SmokeDataCleanup,
  options: {
    kind: "prepaid" | "postpaid";
    category?: "ADULTS" | "KIDS";
    name?: string;
    capacity?: number;
  },
) {
  const category = options.category ?? "ADULTS";
  if (options.kind === "postpaid" && !canJoinPostpaidNow()) {
    throw new Error(
      "UTC 1st is always prepaid-at-join; skip postpaid fixture cases",
    );
  }
  const branches = [SMOKE.branchMainId, SMOKE.branchEastId];
  let lastError: unknown;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const stamp = Date.now() + attempt * 97_000;
    try {
      const created = await apiRequest<{ id: string }>("STAFF", "/batches", {
        method: "POST",
        body: JSON.stringify(
          batchCreateBody({
            studioId: SMOKE.studioId,
            branchId: branches[attempt % branches.length] ?? SMOKE.branchMainId,
            trainerId: SMOKE.users.TRAINER.id,
            name:
              options.name ??
              `${options.kind === "prepaid" ? "Prepaid" : "Postpaid"} ${category} ${stamp}`,
            category,
            scheduleJson: scheduleJsonFor(options.kind, stamp),
            subscriptionIds:
              category === "KIDS" ? SMOKE.kidPlanIds : SMOKE.adultPlanIds,
            capacity: options.capacity,
          }),
        ),
      });
      cleanup.trackBatch(created.id);
      return created;
    } catch (error) {
      lastError = error;
      if (!isScheduleConflict(error)) {
        throw error;
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`Could not create ${options.kind} smoke calendar batch`);
}

export async function createFutureScheduleBatch(
  cleanup: SmokeDataCleanup,
  options: { category?: "ADULTS" | "KIDS" } = {},
) {
  return createCalendarBatch(cleanup, {
    kind: "prepaid",
    category: options.category,
  });
}

function isSmokeSeedBatchId(batchId: string): boolean {
  return (
    batchId === SMOKE.kidsBatchId ||
    batchId === SMOKE.beginnerBatchId ||
    batchId === SMOKE.trialBatchId
  );
}

export async function enrollPrepaid(
  cleanup: SmokeDataCleanup,
  options: {
    category?: "ADULTS" | "KIDS";
    name?: string;
    ageRange?: string;
    studentId?: string;
    batchId?: string;
    planId?: string;
  } = {},
) {
  const category = options.category ?? "ADULTS";
  const stamp = Date.now();
  const student = options.studentId
    ? { id: options.studentId, name: options.name ?? options.studentId }
    : await apiRequest<{ id: string; name: string }>("OWNER", "/users", {
        method: "POST",
        body: JSON.stringify({
          name: options.name ?? `Smoke Pay ${stamp}`,
          email: `smoke-pay-${stamp}@stepup.dev`,
          gender: "FEMALE",
          ageRange:
            options.ageRange ??
            (category === "KIDS" ? "UNDER_10" : "TWENTY_TO_FORTY"),
          styles: ["Hip Hop"],
        }),
      });
  if (!options.studentId) {
    cleanup.trackStudent(student.id);
  }
  const ownedBatchId =
    options.batchId && !isSmokeSeedBatchId(options.batchId)
      ? options.batchId
      : undefined;
  const batch = ownedBatchId
    ? { id: ownedBatchId }
    : await createCalendarBatch(cleanup, {
        kind: "prepaid",
        category,
      });
  const planId =
    options.planId ??
    (category === "KIDS" ? SMOKE.kidMonthlyId : SMOKE.adultMonthlyId);
  const enrollment = await apiRequest<{
    invoice: { id: string; status: string; amount: number } | null;
    billingKind?: string;
  }>("STAFF", `/batches/${batch.id}/enroll`, {
    method: "POST",
    body: JSON.stringify({
      studentId: student.id,
      subscriptionId: planId,
    }),
  });
  expect(enrollment.invoice?.status).toBe("PENDING");
  expect(enrollment.billingKind).toBe("prepaid");
  return { student, invoice: enrollment.invoice!, batch, batchId: batch.id };
}

export async function enrollPostpaid(
  cleanup: SmokeDataCleanup,
  options: {
    category?: "ADULTS" | "KIDS";
    name?: string;
    ageRange?: string;
  } = {},
) {
  const category = options.category ?? "ADULTS";
  const stamp = Date.now();
  const student = await apiRequest<{ id: string; name: string }>(
    "OWNER",
    "/users",
    {
      method: "POST",
      body: JSON.stringify({
        name: options.name ?? `Smoke Postpaid ${stamp}`,
        email: `smoke-postpaid-${stamp}@stepup.dev`,
        gender: "FEMALE",
        ageRange:
          options.ageRange ??
          (category === "KIDS" ? "UNDER_10" : "TWENTY_TO_FORTY"),
        styles: ["Hip Hop"],
      }),
    },
  );
  cleanup.trackStudent(student.id);
  const batch = await createCalendarBatch(cleanup, {
    kind: "postpaid",
    category,
  });
  const planId =
    category === "KIDS" ? SMOKE.kidMonthlyId : SMOKE.adultMonthlyId;
  const enrollment = await apiRequest<{
    invoice: { id: string } | null;
    billingKind?: string;
  }>("STAFF", `/batches/${batch.id}/enroll`, {
    method: "POST",
    body: JSON.stringify({
      studentId: student.id,
      subscriptionId: planId,
    }),
  });
  expect(enrollment.invoice).toBeNull();
  expect(enrollment.billingKind).toBe("postpaid");
  const header = await apiRequest<{
    sessions?: Array<{ id: string; startsAt: string }>;
  }>("STAFF", `/batches/${batch.id}`);
  const sessions = header.sessions ?? [];
  return {
    student,
    batch,
    batchId: batch.id,
    sessions,
    sessionId: markableSessionId(sessions),
  };
}

export async function enrollUnpaidOnPostpaidBatch(
  cleanup: SmokeDataCleanup,
  options: {
    category?: "ADULTS" | "KIDS";
    name?: string;
    ageRange?: string;
  } = {},
) {
  const prepaid = await enrollPrepaid(cleanup, options);
  const dest = await createCalendarBatch(cleanup, {
    kind: "postpaid",
    category: options.category ?? "ADULTS",
  });
  await apiRequest("STAFF", `/batches/${prepaid.batch.id}/switch`, {
    method: "POST",
    body: JSON.stringify({
      studentId: prepaid.student.id,
      toBatchId: dest.id,
    }),
  });
  const header = await apiRequest<{
    sessions?: Array<{ id: string; startsAt: string }>;
  }>("STAFF", `/batches/${dest.id}`);
  const sessions = header.sessions ?? [];
  return {
    ...prepaid,
    batch: dest,
    batchId: dest.id,
    sessions,
    sessionId: markableSessionId(sessions),
  };
}

export { canJoinPostpaidNow };

type Fixtures = {
  asRole: (role: SmokeRole) => Promise<Page>;
};

export const test = base.extend<Fixtures>({
  asRole: async ({ browser }, use) => {
    await use(async (role) => {
      const statePath = authFile(role);
      if (!fs.existsSync(statePath)) {
        throw new Error(
          `Missing auth state for ${role}. Run smoke-setup first.`,
        );
      }
      const context = await browser.newContext({
        storageState: statePath,
      });
      const page = await context.newPage();
      await gotoAuthed(page, role);
      return page;
    });
  },
});

export type { SmokeRole };
export { apiBaseUrl, expect, SMOKE };
