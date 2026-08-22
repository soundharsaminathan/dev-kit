import { BadRequestException } from "@nestjs/common";
import { BookingStatus, BookingType, UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DecryptedUser } from "../users/user-crypto.service";
import {
  createResolvedIds,
  requireResolved,
  StaffAgentToolExecutor,
} from "./tool-executor";

function actor(overrides: Partial<DecryptedUser> = {}): DecryptedUser {
  return {
    id: "staff-1",
    role: UserRole.STAFF,
    studioId: "studio-1",
    email: "staff@stepup.dev",
    name: "Staff",
    phone: null,
    ...overrides,
  } as DecryptedUser;
}

describe("requireResolved", () => {
  it("rejects unknown ids", () => {
    expect(() => requireResolved(new Set(), "x", "studentId")).toThrow(
      BadRequestException,
    );
  });

  it("allows resolved ids", () => {
    expect(() =>
      requireResolved(new Set(["x"]), "x", "studentId"),
    ).not.toThrow();
  });
});

describe("StaffAgentToolExecutor", () => {
  const users = {
    listStudents: vi.fn(),
    listLeads: vi.fn(),
    createLead: vi.fn(),
    createStudent: vi.fn(),
    addLeadRemark: vi.fn(),
    updateStudioStudent: vi.fn(),
    getStudentStudioProfile: vi.fn(),
  };
  const bookings = {
    create: vi.fn(),
    updateStatus: vi.fn(),
  };
  const batchCommands = {
    switchBatch: vi.fn(),
  };
  const batchQueries = {
    listByStudio: vi.fn(),
  };
  const sessions = {
    listTrialSlots: vi.fn(),
  };

  let executor: StaffAgentToolExecutor;

  beforeEach(() => {
    vi.clearAllMocks();
    users.listStudents.mockResolvedValue({ items: [], nextCursor: null });
    users.listLeads.mockResolvedValue({
      items: [],
      nextCursor: null,
      limit: 10,
    });
    executor = new StaffAgentToolExecutor(
      users as never,
      bookings as never,
      batchCommands as never,
      batchQueries as never,
      sessions as never,
    );
  });

  it("rejects create_lead without phone", async () => {
    const result = await executor.execute(
      "create_lead",
      { name: "Riya", age: 25 },
      actor(),
      "studio-1",
      createResolvedIds(),
    );
    expect(result.action?.ok).toBe(false);
    expect(result.content).toContain("phone is required");
    expect(users.createLead).not.toHaveBeenCalled();
  });

  it("rejects set_active without confirm", async () => {
    const resolved = createResolvedIds();
    resolved.people.add("stu-1");
    const result = await executor.execute(
      "set_active",
      { studentId: "stu-1", active: false, confirm: false },
      actor(),
      "studio-1",
      resolved,
    );
    expect(result.action?.ok).toBe(false);
    expect(result.content).toContain("confirm=true");
    expect(users.updateStudioStudent).not.toHaveBeenCalled();
  });

  it("rejects switch_batch without confirm", async () => {
    const resolved = createResolvedIds();
    resolved.people.add("stu-1");
    resolved.batches.add("batch-2");
    const result = await executor.execute(
      "switch_batch",
      {
        studentId: "stu-1",
        toBatchId: "batch-2",
        fromBatchId: "batch-1",
        confirm: false,
      },
      actor(),
      "studio-1",
      resolved,
    );
    expect(result.action?.ok).toBe(false);
    expect(batchCommands.switchBatch).not.toHaveBeenCalled();
  });

  it("rejects mutation for unresolved studentId", async () => {
    const result = await executor.execute(
      "add_remark",
      { studentId: "unknown", body: "Called, no answer" },
      actor(),
      "studio-1",
      createResolvedIds(),
    );
    expect(result.action?.ok).toBe(false);
    expect(result.content).toContain("not resolved");
    expect(users.addLeadRemark).not.toHaveBeenCalled();
  });

  it("creates a lead when required fields are present", async () => {
    users.createLead.mockResolvedValue({
      id: "lead-1",
      name: "Riya",
      phone: "9000000001",
      section: "new",
      trialBooking: null,
    });
    const resolved = createResolvedIds();
    const result = await executor.execute(
      "create_lead",
      {
        name: "Riya",
        phone: "9000000001",
        age: 25,
      },
      actor(),
      "studio-1",
      resolved,
    );
    expect(result.action?.ok).toBe(true);
    expect(resolved.people.has("lead-1")).toBe(true);
    expect(users.createLead).toHaveBeenCalledWith("studio-1", {
      name: "Riya",
      phone: "9000000001",
      ageRange: "TWENTY_TO_FORTY",
      sessionId: undefined,
    });
  });

  it("books a trial when person and session were resolved", async () => {
    const resolved = createResolvedIds();
    resolved.people.add("stu-1");
    resolved.sessions.add("sess-1");
    bookings.create.mockResolvedValue({
      id: "book-1",
      status: BookingStatus.PENDING,
    });

    const result = await executor.execute(
      "book_trial",
      { studentId: "stu-1", sessionId: "sess-1" },
      actor(),
      "studio-1",
      resolved,
    );

    expect(result.action?.ok).toBe(true);
    expect(bookings.create).toHaveBeenCalledWith({
      studioId: "studio-1",
      studentId: "stu-1",
      type: BookingType.TRIAL,
      sessionId: "sess-1",
    });
    expect(resolved.bookings.has("book-1")).toBe(true);
  });

  it("archives with confirm after search resolution", async () => {
    const resolved = createResolvedIds();
    resolved.people.add("stu-1");
    users.updateStudioStudent.mockResolvedValue({});

    const result = await executor.execute(
      "set_active",
      { studentId: "stu-1", active: false, confirm: true },
      actor(),
      "studio-1",
      resolved,
    );

    expect(result.action?.ok).toBe(true);
    expect(users.updateStudioStudent).toHaveBeenCalledWith(
      "studio-1",
      "stu-1",
      { active: false },
    );
  });
});
