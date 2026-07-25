import { expect } from "@playwright/test";
import { apiBaseUrl, bearerFor, type SeedRole } from "../fixtures/seed";

export async function httpJson<T>(
  role: SeedRole,
  pathName: string,
  init: RequestInit = {},
): Promise<{ status: number; data: T; ok: boolean; text: string }> {
  const response = await fetch(`${apiBaseUrl()}${pathName}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearerFor(role)}`,
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
): Promise<T> {
  const result = await httpJson<T>(role, pathName, init);
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
) {
  const result = await httpJson(role, pathName, init);
  expect(result.status, result.text).toBe(status);
  return result;
}
