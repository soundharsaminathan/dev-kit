import type { Page } from "@playwright/test";
import { apiBaseUrl, AUTH_STORAGE_KEY, SEED } from "./seed";
import type { TestDataCleanup } from "./test-cleanup";

export type OnboardedStudent = {
  id: string;
  email: string;
  name: string;
  studioId: string | null;
};

async function studentRequest<T>(
  studentId: string,
  pathName: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${apiBaseUrl()}${pathName}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer dev:STUDENT:${studentId}`,
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

/**
 * Self-signup student with onboarding done. OWNER `/users` students start
 * with `mustChangePassword` and no `onboardingCompletedAt`, so bypass
 * impersonation would land on change-password / onboarding.
 */
export async function createOnboardedStudent(
  namePrefix: string,
  cleanup?: TestDataCleanup,
): Promise<OnboardedStudent> {
  const stamp = Date.now();
  const slug = namePrefix.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const provisionalId = `dev-${slug}-${stamp}`;
  const email = `${slug}-${stamp}@stepup.dev`;
  const name = `${namePrefix} ${stamp}`;

  const student = await studentRequest<OnboardedStudent>(
    provisionalId,
    "/auth/sync",
    {
      method: "POST",
      body: JSON.stringify({
        name,
        email,
        create: true,
        studioId: SEED.studioId,
      }),
    },
  );

  cleanup?.trackStudent(student.id);

  await studentRequest(student.id, "/users/me", {
    method: "PATCH",
    body: JSON.stringify({
      name,
      gender: "FEMALE",
      ageRange: "TWENTY_TO_FORTY",
      experienceLevel: "BEGINNER",
      styles: ["Hip Hop"],
    }),
  });

  await studentRequest(student.id, "/users/me/onboarding/complete", {
    method: "POST",
    body: "{}",
  });

  return student;
}

export async function impersonateStudent(
  page: Page,
  student: OnboardedStudent,
) {
  await page.goto("/login");
  await page.evaluate(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
    },
    {
      key: AUTH_STORAGE_KEY,
      value: {
        id: student.id,
        email: student.email,
        name: student.name,
        role: "STUDENT",
        studioId: student.studioId ?? SEED.studioId,
        styles: ["Hip Hop"],
        experienceLevel: "BEGINNER",
        gender: "FEMALE",
        ageRange: "TWENTY_TO_FORTY",
        onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
        mustChangePassword: false,
      },
    },
  );
}
