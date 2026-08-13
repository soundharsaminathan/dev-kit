import { expect } from "@playwright/test";
import {
  batchCreateBody,
  isScheduleConflict,
  prepaidScheduleJson,
} from "../fixtures/billing-calendar";
import { apiBaseUrl, bearerFor, SEED, type SeedRole } from "../fixtures/seed";
import { TestDataCleanup } from "../fixtures/test-cleanup";

export { TestDataCleanup };

export function unwrapPage<T>(data: T[] | { items: T[] }): T[] {
  return Array.isArray(data) ? data : data.items;
}

export async function httpJson<T>(
  role: SeedRole,
  pathName: string,
  init: RequestInit = {},
  options?: { userId?: string },
): Promise<{ status: number; data: T; ok: boolean; text: string }> {
  const authorization = options?.userId
    ? `Bearer dev:${role}:${options.userId}`
    : `Bearer ${bearerFor(role)}`;
  const response = await fetch(`${apiBaseUrl()}${pathName}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: authorization,
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  const data = (text ? JSON.parse(text) : undefined) as T;
  return {
    status: response.status,
    data,
    ok: response.ok,
    text,
  };
}

export async function expectOk<T>(
  role: SeedRole,
  pathName: string,
  init?: RequestInit,
  options?: { userId?: string },
): Promise<T> {
  const result = await httpJson<T>(role, pathName, init, options);
  expect(
    result.ok,
    `${init?.method ?? "GET"} ${pathName} → ${result.status} ${result.text}`,
  ).toBeTruthy();
  return result.data;
}

export async function expectStatus(
  role: SeedRole,
  pathName: string,
  status: number,
  init?: RequestInit,
  options?: { userId?: string },
) {
  const result = await httpJson(role, pathName, init, options);
  expect(result.status, result.text).toBe(status);
  return result;
}

type RosterRow = {
  studentId: string;
  monthlyUnpaid?: boolean;
  inactiveReason?: string;
};

/** GET /batches/:id is header-only; roster rows live on /roster. */
export async function fetchRosterRows(
  batchId: string,
  tab: "active" | "inactive" = "active",
  role: SeedRole = "STAFF",
): Promise<RosterRow[]> {
  const rows: RosterRow[] = [];
  let cursor: string | undefined;
  do {
    const params = new URLSearchParams({ tab, limit: "50" });
    if (cursor) {
      params.set("cursor", cursor);
    }
    const page = await expectOk<{
      items: RosterRow[];
      nextCursor: string | null;
    }>(role, `/batches/${batchId}/roster?${params.toString()}`);
    rows.push(...unwrapPage(page));
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return rows;
}

export async function createHttpStudent(
  name = "HTTP Student",
  cleanup?: TestDataCleanup,
  options: { ageRange?: string } = {},
) {
  const email = `http-student-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@stepup.dev`;
  const student = await expectOk<{ id: string; email: string; name: string }>(
    "OWNER",
    "/users",
    {
      method: "POST",
      body: JSON.stringify({
        name,
        email,
        gender: "FEMALE",
        ageRange: options.ageRange ?? "TWENTY_TO_FORTY",
        styles: ["Hip Hop"],
      }),
    },
  );
  cleanup?.trackStudent(student.id);
  return student;
}

/** Owned prepaid batch: schedule starts next UTC month (invoice at staff enroll). */
export async function createFutureScheduleBatch(
  cleanup: TestDataCleanup,
  options: { category?: "ADULTS" | "KIDS"; name?: string } = {},
) {
  const category = options.category ?? "ADULTS";
  const trainers = [SEED.users.TRAINER.id, SEED.users.TRAINER_2.id];
  const branches = [SEED.branchMainId, SEED.branchEastId];
  let lastError: unknown;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const stamp = Date.now() + attempt * 97_000;
    try {
      const created = await expectOk<{ id: string }>("STAFF", "/batches", {
        method: "POST",
        body: JSON.stringify(
          batchCreateBody({
            studioId: SEED.users.STAFF.studioId,
            branchId: branches[attempt % branches.length],
            trainerId: trainers[Math.floor(attempt / 2) % trainers.length],
            name: options.name ?? `HTTP Prepaid Batch ${stamp}`,
            category,
            scheduleJson: prepaidScheduleJson(stamp),
            subscriptionIds:
              category === "KIDS" ? SEED.kidPlanIds : SEED.adultPlanIds,
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
    : new Error("Could not create prepaid calendar batch");
}

export async function deleteHttpStudent(studentId: string) {
  const studioId = SEED.users.OWNER.studioId;
  return expectOk("OWNER", `/users/studio/${studioId}/students/${studentId}`, {
    method: "DELETE",
  });
}

export async function deleteHttpBatch(batchId: string) {
  return expectOk("STAFF", `/batches/${batchId}`, { method: "DELETE" });
}
