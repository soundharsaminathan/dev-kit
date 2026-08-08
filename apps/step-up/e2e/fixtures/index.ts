import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test as base, expect, type Page } from "@playwright/test";
import {
  AUTH_STORAGE_KEY,
  apiBaseUrl,
  bearerFor,
  SEED,
  type SeedRole,
  webBaseUrl,
} from "./seed";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const authDir = path.join(dirname, "../.auth");

export function authFile(role: SeedRole) {
  return path.join(authDir, `${role.toLowerCase()}.json`);
}

export function homePathForRole(role: SeedRole) {
  if (role === "SYSTEM_ADMIN") return "/admin";
  return role === "STUDENT" || role === "PARENT" ? "/me" : "/app";
}

/** Playwright storageState for bypass-auth (no browser login required). */
export function writeRoleStorageState(role: SeedRole) {
  fs.mkdirSync(authDir, { recursive: true });
  const user = SEED.users[role];
  const state = {
    cookies: [] as unknown[],
    origins: [
      {
        origin: webBaseUrl(),
        localStorage: [
          {
            name: AUTH_STORAGE_KEY,
            value: JSON.stringify(user),
          },
        ],
      },
    ],
  };
  fs.writeFileSync(authFile(role), JSON.stringify(state, null, 2));
}

/**
 * App is ready when the HTML boot splash / React DanceLoader is gone and the
 * shell exposes interactive content. Cold Vite route compiles under parallel
 * workers can keep the shell empty well past the default expect timeout —
 * wait on that ready signal, not a fixed sleep.
 */
export async function waitForAppReady(page: Page) {
  const readyTimeout = 60_000;
  // Login/register keep a static #boot-public shell until first interaction
  // (LCP). Nudge dismiss if the React app has mounted underneath.
  const bootPublic = page.locator("#boot-public");
  if ((await bootPublic.count()) > 0) {
    await page
      .locator("body")
      .click({ position: { x: 2, y: 2 }, force: true })
      .catch(() => undefined);
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

export async function waitForApiReady(
  request: {
    get: (
      url: string,
      options?: { headers?: Record<string, string> },
    ) => Promise<{
      ok: () => boolean;
      status: () => number;
      text: () => Promise<string>;
    }>;
  },
  role: SeedRole = "OWNER",
) {
  const token = bearerFor(role);
  const api = apiBaseUrl();
  await expect
    .poll(
      async () => {
        try {
          const health = await request.get(`${api}/health`);
          if (!health.ok()) return `health:${health.status()}`;
          const me = await request.get(`${api}/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!me.ok()) {
            return `users/me:${me.status()}:${(await me.text()).slice(0, 160)}`;
          }
          return "ok";
        } catch (error) {
          return `error:${String(error).slice(0, 160)}`;
        }
      },
      {
        timeout: 30_000,
        intervals: [250, 500, 1000],
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
        timeout: 30_000,
        intervals: [250, 500, 1000],
        message: `Web not ready at ${web}`,
      },
    )
    .toBe("ok");
}

export async function gotoAuthed(
  page: Page,
  role: SeedRole,
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

/** Wait for a matching API response produced by a UI action. */
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

export { TestDataCleanup } from "./test-cleanup";

export async function apiRequest<T>(
  role: SeedRole,
  pathName: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${apiBaseUrl()}${pathName}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearerFor(role)}`,
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

type Fixtures = {
  asRole: (role: SeedRole) => Promise<Page>;
};

export const test = base.extend<Fixtures>({
  asRole: async ({ browser }, use) => {
    await use(async (role) => {
      const statePath = authFile(role);
      if (!fs.existsSync(statePath)) {
        writeRoleStorageState(role);
      }
      const context = await browser.newContext({ storageState: statePath });
      const page = await context.newPage();
      await gotoAuthed(page, role);
      return page;
    });
  },
});

export { expect };
