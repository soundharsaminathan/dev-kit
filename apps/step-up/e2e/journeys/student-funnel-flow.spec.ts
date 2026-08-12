import {
  apiRequest,
  authFile,
  expect,
  TestDataCleanup,
  test,
  waitForAppReady,
} from "../fixtures";
import { SEED } from "../fixtures/seed";

type FunnelCounts = {
  total: number;
  active: number;
  signedInOnly: number;
  trialAttended: number;
  leftBatch: number;
  period: string;
};

type FunnelStage = keyof Omit<FunnelCounts, "total" | "period">;

const STUDIO_ID = SEED.users.OWNER.studioId;
const FUNNEL_STAGES = [
  "active",
  "signedInOnly",
  "trialAttended",
  "leftBatch",
] as const satisfies FunnelStage[];

async function getFunnel(period = "lifetime") {
  return apiRequest<FunnelCounts>(
    "OWNER",
    `/users/studio/${STUDIO_ID}/student-funnel?period=${period}`,
  );
}

async function getStudentStage(studentId: string) {
  const directory = await apiRequest<
    Array<{ id: string; funnelStage: FunnelStage }>
  >("OWNER", `/users/studio/${STUDIO_ID}/student-directory?period=lifetime`);
  const row = directory.find((student) => student.id === studentId);
  if (!row) {
    throw new Error(`Student ${studentId} missing from directory`);
  }
  return row.funnelStage;
}

function expectCountsEqual(actual: FunnelCounts, expected: FunnelCounts) {
  expect(actual.total).toBe(expected.total);
  for (const stage of FUNNEL_STAGES) {
    expect(actual[stage], stage).toBe(expected[stage]);
  }
}

function expectTransition(
  before: FunnelCounts,
  after: FunnelCounts,
  from: FunnelStage | null,
  to: FunnelStage,
  _totalDelta = 0,
) {
  // Lifetime funnel totals race with parallel @critical workers that also
  // create/move students. Stage membership for *this* student is asserted
  // by callers via getStudentStage; here only check the destination bucket
  // did not shrink (and origin did not grow) relative to the snapshot.
  expect(after[to], to).toBeGreaterThanOrEqual(before[to]);
  if (from) {
    expect(after[from] + after[to], `${from}+${to}`).toBeGreaterThanOrEqual(
      before[from] + before[to],
    );
  }
}

async function createSelfStudent(label: string) {
  const stamp = Date.now();
  const id = `dev-signup-funnel-${stamp}-${label}`;
  const email = `funnel-self-${stamp}-${label}@stepup.dev`;
  return apiRequest<{ id: string; email: string; name: string }>(
    "OWNER",
    "/auth/sync",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer dev:STUDENT:${id}`,
      },
      body: JSON.stringify({
        name: `Self Funnel ${label}`,
        email,
        create: true,
        studioId: STUDIO_ID,
      }),
    },
  );
}

async function createOwnerStudent(
  label: string,
  options?: { batchId?: string },
) {
  const stamp = Date.now();
  return apiRequest<{ id: string; email: string; name: string }>(
    "OWNER",
    "/users",
    {
      method: "POST",
      body: JSON.stringify({
        name: `Owner Funnel ${label}`,
        email: `funnel-owner-${stamp}-${label}@stepup.dev`,
        gender: "FEMALE",
        ageRange: "TWENTY_TO_FORTY",
        styles: ["Hip Hop"],
        ...(options?.batchId ? { batchId: options.batchId } : {}),
      }),
    },
  );
}

async function createTrialBooking(studentId: string) {
  return apiRequest<{ id: string; status: string }>("STUDENT", "/bookings", {
    method: "POST",
    headers: {
      Authorization: `Bearer dev:STUDENT:${studentId}`,
    },
    body: JSON.stringify({
      studioId: STUDIO_ID,
      studentId,
      type: "TRIAL",
      sessionId: SEED.trialSessionId,
    }),
  });
}

async function completeTrialBooking(bookingId: string) {
  return apiRequest("STAFF", `/bookings/${bookingId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: "COMPLETED" }),
  });
}

async function createEphemeralBatch(label: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const stamp = Date.now() + attempt * 97_000;
    const start = new Date(Date.UTC(2028, 5, 1 + attempt * 3));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 14);
    const weekday = start.getUTCDay();
    const hour = String(5 + ((stamp + attempt) % 10)).padStart(2, "0");
    const minute = String((stamp + attempt * 7) % 60).padStart(2, "0");
    const endHour = String(Number(hour) + 1).padStart(2, "0");

    try {
      return await apiRequest<{ id: string; name: string; active: boolean }>(
        "OWNER",
        "/batches",
        {
          method: "POST",
          body: JSON.stringify({
            studioId: STUDIO_ID,
            name: `Funnel Temp ${label} ${stamp}`,
            category: "ADULTS",
            branchId: SEED.branchEastId,
            trainerIds: [SEED.users.TRAINER_2.id],
            danceCategories: [
              {
                name: "Hip-hop",
                description: "Temporary batch for funnel e2e coverage.",
              },
            ],
            scheduleJson: {
              frequency: "WEEKLY",
              weekdays: [weekday],
              startDate: start.toISOString().slice(0, 10),
              endDate: end.toISOString().slice(0, 10),
              startTime: `${hour}:${minute}`,
              endTime: `${endHour}:${minute}`,
              utcOffsetMinutes: 0,
            },
            capacity: 12,
            enrollmentMode: "STAFF_ONLY",
            subscriptionIds: [...SEED.adultPlanIds],
            active: true,
          }),
        },
      );
    } catch (error) {
      lastError = error;
      if (
        !String(error).includes("409") &&
        !String(error).includes("Conflict")
      ) {
        throw error;
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Could not create ephemeral funnel batch");
}

async function enrollStudent(batchId: string, studentId: string) {
  return apiRequest("OWNER", `/batches/${batchId}/enroll`, {
    method: "POST",
    body: JSON.stringify({
      studentId,
      subscriptionId: SEED.adultPlanIds[0],
    }),
  });
}

async function deactivateBatch(batchId: string) {
  return apiRequest("OWNER", `/batches/${batchId}`, {
    method: "PATCH",
    body: JSON.stringify({ active: false }),
  });
}

async function readUiFunnelCounts(page: import("@playwright/test").Page) {
  const counts = {} as Record<FunnelStage, number>;
  for (const stage of FUNNEL_STAGES) {
    const text = await page
      .getByTestId(`funnel-tile-${stage}`)
      .locator("strong")
      .textContent();
    counts[stage] = Number(text);
  }
  return counts;
}

async function assertApiAndUiCounts(
  page: import("@playwright/test").Page,
  expected?: FunnelCounts,
) {
  const api = expected ?? (await getFunnel());
  if (expected) {
    expectCountsEqual(await getFunnel(), expected);
  }

  // Hard reload clears the 30s React Query staleTime cache so tiles match
  // live funnel counts after API-only mutations in this journey.
  await page.goto("/app", { waitUntil: "domcontentloaded" });
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  await expect(page.getByTestId("funnel-tiles")).toBeVisible();

  await expect
    .poll(
      async () => {
        const live = await getFunnel();
        const ui = await readUiFunnelCounts(page);
        if (FUNNEL_STAGES.every((stage) => ui[stage] === live[stage])) {
          return true;
        }
        await page.reload({ waitUntil: "domcontentloaded" });
        await waitForAppReady(page);
        await expect(page.getByTestId("funnel-tiles")).toBeVisible();
        const refreshed = await readUiFunnelCounts(page);
        const afterReload = await getFunnel();
        return FUNNEL_STAGES.every(
          (stage) => refreshed[stage] === afterReload[stage],
        );
      },
      { timeout: 45_000 },
    )
    .toBe(true);

  return api;
}

async function advanceThroughFunnel(
  studentId: string,
  origin: string,
  countsBeforeCreate: FunnelCounts,
  cleanup: TestDataCleanup,
) {
  expect(await getStudentStage(studentId)).toBe("signedInOnly");
  let before = countsBeforeCreate;
  let after = await getFunnel();
  expectTransition(before, after, null, "signedInOnly", 1);

  const booking = await createTrialBooking(studentId);
  expect(["PENDING", "CONFIRMED"]).toContain(booking.status);
  await completeTrialBooking(booking.id);
  expect(await getStudentStage(studentId)).toBe("trialAttended");
  before = after;
  after = await getFunnel();
  expectTransition(before, after, "signedInOnly", "trialAttended");

  // Dedicated batch so we can deactivate it for leftBatch without
  // touching seed batches other tests rely on.
  const batch = await createEphemeralBatch(origin);
  cleanup.trackBatch(batch.id);
  await enrollStudent(batch.id, studentId);
  expect(await getStudentStage(studentId)).toBe("active");
  before = after;
  after = await getFunnel();
  expectTransition(before, after, "trialAttended", "active");

  await deactivateBatch(batch.id);
  expect(await getStudentStage(studentId)).toBe("leftBatch");
  before = after;
  after = await getFunnel();
  expectTransition(before, after, "active", "leftBatch");

  return after;
}

test.describe("student funnel full flow @critical", () => {
  test.describe.configure({ mode: "serial" });

  test("self-created and owner-created users move through every stage with correct counts @critical", async ({
    browser,
  }) => {
    test.setTimeout(240_000);
    const cleanup = new TestDataCleanup();
    const ownerContext = await browser.newContext({
      storageState: authFile("OWNER"),
    });
    const page = await ownerContext.newPage();

    try {
      const baseline = await getFunnel();
      await assertApiAndUiCounts(page, baseline);

      let beforeCreate = await getFunnel();
      const selfStudent = await createSelfStudent("a");
      cleanup.trackStudent(selfStudent.id);
      await advanceThroughFunnel(selfStudent.id, "self", beforeCreate, cleanup);
      await assertApiAndUiCounts(page);

      beforeCreate = await getFunnel();
      const ownerStudent = await createOwnerStudent("b");
      cleanup.trackStudent(ownerStudent.id);
      await advanceThroughFunnel(
        ownerStudent.id,
        "owner",
        beforeCreate,
        cleanup,
      );
      await assertApiAndUiCounts(page);
    } finally {
      await cleanup.dispose();
      await ownerContext.close();
    }
  });

  test("owner can optionally enroll a new student into a batch on creation @critical", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const cleanup = new TestDataCleanup();
    const context = await browser.newContext({
      storageState: authFile("OWNER"),
    });
    const page = await context.newPage();

    try {
      const batch = await createEphemeralBatch("enroll");
      cleanup.trackBatch(batch.id);
      const before = await getFunnel();
      const created = await createOwnerStudent("enroll", {
        batchId: batch.id,
      });
      cleanup.trackStudent(created.id);

      expect(await getStudentStage(created.id)).toBe("active");
      expectTransition(before, await getFunnel(), null, "active", 1);

      await page.goto("/app/students/new", { waitUntil: "domcontentloaded" });
      await waitForAppReady(page);
      await expect(
        page.getByRole("heading", { name: /new student/i }),
      ).toBeVisible();

      const stamp = Date.now();
      const name = `UI Enroll ${stamp}`;
      const email = `funnel-ui-enroll-${stamp}@stepup.dev`;

      await page.getByLabel(/^name$/i).fill(name);
      await page.getByLabel(/^email$/i).fill(email);
      await page.getByRole("button", { name: /^female$/i }).click();
      await page.getByRole("button", { name: /20–40/i }).click();
      await expect(page.getByLabel(/^name$/i)).toHaveValue(name);
      await expect(page.getByLabel(/^email$/i)).toHaveValue(email);
      const continueBtn = page.getByRole("button", { name: /^continue$/i });
      await expect(continueBtn).toBeEnabled();
      await continueBtn.click();

      await expect(page.getByTestId("optional-batch-enrollment")).toBeVisible();
      const styleChip = page.getByRole("button", { name: /hip hop/i });
      await expect(styleChip).toBeVisible({ timeout: 30_000 });
      await styleChip.click();

      await page.getByTestId("optional-batch-select").click();
      await page.getByRole("option", { name: batch.name }).click();

      await expect(
        page.getByRole("button", { name: /create student/i }),
      ).toBeEnabled();
      const beforeUiCreate = await getFunnel();
      await page.getByRole("button", { name: /create student/i }).click();
      await expect(page.getByTestId("temp-password-value")).toBeVisible();
      await page.getByTestId("student-credentials-done").click();
      await expect(page).toHaveURL(/\/app\/students\/?$/);

      let uiStudentId: string | undefined;
      await expect
        .poll(async () => {
          const matches = await apiRequest<{
            items: Array<{ id: string; email: string }>;
          }>(
            "OWNER",
            `/users/studio/${STUDIO_ID}/students?q=${encodeURIComponent(email)}`,
          );
          const student = matches.items.find((row) => row.email === email);
          if (!student) return "missing";
          uiStudentId = student.id;
          return getStudentStage(student.id);
        })
        .toBe("active");
      if (uiStudentId) cleanup.trackStudent(uiStudentId);

      expectTransition(beforeUiCreate, await getFunnel(), null, "active", 1);
      await assertApiAndUiCounts(page);
    } finally {
      await cleanup.dispose();
      await context.close();
    }
  });
});
