import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test as base, expect, type Page } from "@playwright/test";
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
  await expect(page.locator("#boot-splash, [data-boot-loader]")).toHaveCount(
    0,
    {
      timeout: readyTimeout,
    },
  );
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
export { expect, SMOKE, apiBaseUrl };
