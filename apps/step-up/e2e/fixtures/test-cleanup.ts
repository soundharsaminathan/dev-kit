import { apiBaseUrl, bearerFor, SEED } from "./seed";

async function bestEffortDelete(role: "OWNER" | "STAFF", pathName: string) {
  try {
    await fetch(`${apiBaseUrl()}${pathName}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${bearerFor(role)}`,
      },
    });
  } catch {
    // Ignore cleanup failures so they don't mask the original test error.
  }
}

/** Tracks users/batches created during a test and deletes them afterwards. */
export class TestDataCleanup {
  private readonly students: string[] = [];
  private readonly batches: string[] = [];

  trackStudent(id: string) {
    this.students.push(id);
    return id;
  }

  trackBatch(id: string) {
    this.batches.push(id);
    return id;
  }

  async dispose() {
    const studioId = SEED.users.OWNER.studioId;
    // Students first so enrollments cascade off ephemeral batches.
    const studentIds = this.students.splice(0);
    for (const studentId of studentIds) {
      await bestEffortDelete(
        "OWNER",
        `/users/studio/${studioId}/students/${studentId}`,
      );
    }
    const batchIds = this.batches.splice(0);
    for (const batchId of batchIds) {
      await bestEffortDelete("STAFF", `/batches/${batchId}`);
    }
  }
}
