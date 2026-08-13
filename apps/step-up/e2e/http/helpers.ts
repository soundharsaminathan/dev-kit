import { expect } from "@playwright/test";
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
) {
  const email = `http-student-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@stepup.dev`;
  const student = await expectOk<{ id: string; email: string }>(
    "OWNER",
    "/users",
    {
      method: "POST",
      body: JSON.stringify({
        name,
        email,
        gender: "FEMALE",
        ageRange: "TWENTY_TO_FORTY",
        styles: ["Hip Hop"],
      }),
    },
  );
  cleanup?.trackStudent(student.id);
  return student;
}

/** Batch with no sessions this month → enroll is prepaid-at-join (invoice now). */
export async function createFutureScheduleBatch(
  cleanup: TestDataCleanup,
  options: { category?: "ADULTS" | "KIDS"; name?: string } = {},
) {
  const category = options.category ?? "ADULTS";
  const stamp = Date.now();
  const hour = String(5 + (stamp % 8)).padStart(2, "0");
  const minute = String(stamp % 60).padStart(2, "0");
  const endMinute = String((Number(minute) + 45) % 60).padStart(2, "0");
  const endHour = String(
    Number(hour) + (Number(minute) + 45 >= 60 ? 1 : 0),
  ).padStart(2, "0");
  const created = await expectOk<{ id: string }>("STAFF", "/batches", {
    method: "POST",
    body: JSON.stringify({
      studioId: SEED.users.STAFF.studioId,
      name: options.name ?? `HTTP Prepaid Batch ${stamp}`,
      coverImageUrl:
        "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80",
      category,
      branchId: SEED.branchMainId,
      trainerIds: [SEED.users.TRAINER.id],
      danceCategories: [{ name: "Hip Hop", description: "Prepaid join batch" }],
      scheduleJson: {
        frequency: "WEEKLY",
        weekdays: [stamp % 7],
        startDate: "2027-01-03",
        endDate: "2027-03-28",
        startTime: `${hour}:${minute}`,
        endTime: `${endHour}:${endMinute}`,
        utcOffsetMinutes: 0,
      },
      capacity: 8,
      enrollmentMode: "SELF_JOIN",
      subscriptionIds:
        category === "KIDS" ? [...SEED.kidPlanIds] : [...SEED.adultPlanIds],
      active: true,
      certificationEnabled: false,
    }),
  });
  cleanup.trackBatch(created.id);
  return created;
}

export async function createPendingInvoiceViaEnroll(
  cleanup: TestDataCleanup,
  options: {
    batchId?: string;
    planId?: string;
    studentName?: string;
    studentId?: string;
    category?: "ADULTS" | "KIDS";
  } = {},
) {
  const category =
    options.category ?? (options.planId?.includes("kid") ? "KIDS" : "ADULTS");
  const planId =
    options.planId ??
    (category === "KIDS" ? SEED.kidPlanIds[0] : SEED.adultPlanIds[0]);
  const student = options.studentId
    ? { id: options.studentId }
    : await createHttpStudent(
        options.studentName ?? "Billing Invoice Student",
        cleanup,
      );
  const batchId =
    options.batchId ??
    (await createFutureScheduleBatch(cleanup, { category })).id;
  const enrollment = await expectOk<{
    invoice: { id: string; status: string; amount: number } | null;
    billingKind?: string;
  }>("STAFF", `/batches/${batchId}/enroll`, {
    method: "POST",
    body: JSON.stringify({
      studentId: student.id,
      subscriptionId: planId,
    }),
  });
  expect(
    enrollment.invoice,
    "prepaid-at-join should create an invoice",
  ).toBeTruthy();
  expect(enrollment.invoice?.status).toBe("PENDING");
  return { student, invoice: enrollment.invoice!, batchId };
}

/**
 * Seed batches already ran this month (postpaid, no invoice at enroll).
 * Prepaid invoice + seat on the seed roster: enroll a future batch, then switch.
 */
export async function enrollSeedBatchWithPrepaidInvoice(
  cleanup: TestDataCleanup,
  targetBatchId: string,
  options: {
    planId?: string;
    studentName?: string;
    studentId?: string;
    category?: "ADULTS" | "KIDS";
  } = {},
) {
  const category =
    options.category ??
    (targetBatchId === SEED.kidsBatchId ? "KIDS" : "ADULTS");
  const created = await createPendingInvoiceViaEnroll(cleanup, {
    ...options,
    category,
    planId:
      options.planId ??
      (category === "KIDS" ? SEED.kidPlanIds[0] : SEED.adultPlanIds[0]),
  });
  await expectOk("STAFF", `/batches/${created.batchId}/switch`, {
    method: "POST",
    body: JSON.stringify({
      studentId: created.student.id,
      toBatchId: targetBatchId,
    }),
  });
  return { ...created, batchId: targetBatchId };
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
