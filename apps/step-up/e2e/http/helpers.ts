import { expect } from "@playwright/test";
import { apiBaseUrl, bearerFor, SEED, type SeedRole } from "../fixtures/seed";
import { TestDataCleanup } from "../fixtures/test-cleanup";

export { TestDataCleanup };

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

export async function deleteHttpStudent(studentId: string) {
  const studioId = SEED.users.OWNER.studioId;
  return expectOk("OWNER", `/users/studio/${studioId}/students/${studentId}`, {
    method: "DELETE",
  });
}

export async function deleteHttpBatch(batchId: string) {
  return expectOk("STAFF", `/batches/${batchId}`, { method: "DELETE" });
}
