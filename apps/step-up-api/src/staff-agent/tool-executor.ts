import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import {
  type AgeRange,
  BookingStatus,
  BookingType,
  Gender,
} from "@prisma/client";
import { BatchCommandsService } from "../batches/application/batch.commands";
import { BatchQueriesService } from "../batches/application/batch.queries";
import { BookingCommandsService } from "../bookings/application/booking.commands";
import { SessionsService } from "../sessions/sessions.service";
import { ageRangeFromAge, isImportAge } from "../users/age-range";
import type { DecryptedUser } from "../users/user-crypto.service";
import { UsersService } from "../users/users.service";

export type StaffAgentAction = {
  tool: string;
  ok: boolean;
  summary: string;
};

export type ToolExecutionResult = {
  content: string;
  action?: StaffAgentAction;
};

/** IDs discovered via tools in the current chat turn (search/list/create). */
export type ResolvedIds = {
  people: Set<string>;
  sessions: Set<string>;
  bookings: Set<string>;
  batches: Set<string>;
};

export function createResolvedIds(): ResolvedIds {
  return {
    people: new Set(),
    sessions: new Set(),
    bookings: new Set(),
    batches: new Set(),
  };
}

const GENDERS = new Set<string>(Object.values(Gender));

@Injectable()
export class StaffAgentToolExecutor {
  constructor(
    @Inject(UsersService) private readonly users: UsersService,
    @Inject(BookingCommandsService)
    private readonly bookings: BookingCommandsService,
    @Inject(BatchCommandsService)
    private readonly batchCommands: BatchCommandsService,
    @Inject(BatchQueriesService)
    private readonly batchQueries: BatchQueriesService,
    @Inject(SessionsService) private readonly sessions: SessionsService,
  ) {}

  async execute(
    name: string,
    rawArgs: unknown,
    actor: DecryptedUser,
    studioId: string,
    resolved: ResolvedIds,
  ): Promise<ToolExecutionResult> {
    const args = asRecord(rawArgs);

    try {
      switch (name) {
        case "search_people":
          return await this.searchPeople(studioId, args, resolved);
        case "list_trial_slots":
          return await this.listTrialSlots(studioId, resolved);
        case "list_batches":
          return await this.listBatches(studioId, args, resolved);
        case "create_lead":
          return await this.createLead(studioId, args, resolved);
        case "create_student":
          return await this.createStudent(studioId, args, resolved);
        case "add_remark":
          return await this.addRemark(studioId, actor, args, resolved);
        case "book_trial":
          return await this.bookTrial(studioId, args, resolved);
        case "switch_trial":
          return await this.switchTrial(args, resolved);
        case "confirm_trial":
          return await this.confirmTrial(args, resolved);
        case "set_active":
          return await this.setActive(studioId, args, resolved);
        case "switch_batch":
          return await this.switchBatch(studioId, args, resolved);
        default:
          return {
            content: JSON.stringify({ error: `Unknown tool: ${name}` }),
            action: {
              tool: name,
              ok: false,
              summary: `Unknown tool ${name}`,
            },
          };
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Tool execution failed";
      return {
        content: JSON.stringify({ error: message }),
        action: { tool: name, ok: false, summary: message },
      };
    }
  }

  private async searchPeople(
    studioId: string,
    args: Record<string, unknown>,
    resolved: ResolvedIds,
  ): Promise<ToolExecutionResult> {
    const q = requireString(args, "q");
    type PersonHit = {
      id: string;
      name: string;
      phone: string | null;
      active: boolean;
      section?: string;
      trialBooking?: {
        id: string;
        status: string;
        sessionId: string | null;
        sessionStartsAt: string | null;
        batchName: string | null;
      } | null;
      source: "directory" | "lead" | "archived";
    };

    const byId = new Map<string, PersonHit>();

    const [students, archived, ...leadPages] = await Promise.all([
      this.users.listStudents(studioId, { q, limit: 15 }),
      this.users.listLeads(studioId, {
        section: "archived",
        q,
        limit: 10,
      }),
      this.users.listLeads(studioId, { section: "new", q, limit: 10 }),
      this.users.listLeads(studioId, { section: "trialBooked", q, limit: 10 }),
      this.users.listLeads(studioId, {
        section: "trialAttended",
        q,
        limit: 10,
      }),
    ]);

    for (const s of students.items) {
      byId.set(s.id, {
        id: s.id,
        name: s.name,
        phone: s.phone,
        active: s.active,
        source: "directory",
      });
    }

    for (const lead of [
      ...archived.items,
      ...leadPages.flatMap((page) => page.items),
    ]) {
      const existing = byId.get(lead.id);
      byId.set(lead.id, {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        active: lead.active,
        section: lead.section,
        trialBooking: lead.trialBooking,
        source: lead.section === "archived" ? "archived" : "lead",
        ...(existing ? { source: existing.source } : {}),
      });
      if (lead.trialBooking) {
        resolved.bookings.add(lead.trialBooking.id);
        if (lead.trialBooking.sessionId) {
          resolved.sessions.add(lead.trialBooking.sessionId);
        }
      }
    }

    const people = [...byId.values()];
    for (const person of people) {
      resolved.people.add(person.id);
    }

    return {
      content: JSON.stringify({
        count: people.length,
        people: people.slice(0, 20),
      }),
      action: {
        tool: "search_people",
        ok: true,
        summary: `Found ${people.length} people for “${q}”`,
      },
    };
  }

  private async listTrialSlots(
    studioId: string,
    resolved: ResolvedIds,
  ): Promise<ToolExecutionResult> {
    const slots = await this.sessions.listTrialSlots(studioId);
    for (const slot of slots) {
      resolved.sessions.add(slot.sessionId);
      resolved.batches.add(slot.batchId);
    }
    return {
      content: JSON.stringify({
        count: slots.length,
        slots: slots.slice(0, 30).map((s) => ({
          sessionId: s.sessionId,
          batchId: s.batchId,
          batchName: s.batchName,
          startsAt: s.startsAt,
          endsAt: s.endsAt,
        })),
      }),
      action: {
        tool: "list_trial_slots",
        ok: true,
        summary: `${slots.length} trial slots`,
      },
    };
  }

  private async listBatches(
    studioId: string,
    args: Record<string, unknown>,
    resolved: ResolvedIds,
  ): Promise<ToolExecutionResult> {
    const search =
      typeof args.search === "string" ? args.search.trim() : undefined;
    const page = await this.batchQueries.listByStudio(
      studioId,
      { activeOnly: true, search },
      { limit: 30 },
    );
    const batches = page.items.map((item) => {
      const id = String(item.id ?? "");
      const name = String(item.name ?? "");
      if (id) {
        resolved.batches.add(id);
      }
      return { id, name, capacity: item.capacity, active: item.active };
    });
    return {
      content: JSON.stringify({ count: batches.length, batches }),
      action: {
        tool: "list_batches",
        ok: true,
        summary: `${batches.length} batches`,
      },
    };
  }

  private async createLead(
    studioId: string,
    args: Record<string, unknown>,
    resolved: ResolvedIds,
  ): Promise<ToolExecutionResult> {
    const name = requireString(args, "name");
    const phone = requireString(args, "phone");
    const ageRange = requireAge(args);
    const sessionId =
      typeof args.sessionId === "string" && args.sessionId.trim()
        ? args.sessionId.trim()
        : undefined;
    if (sessionId) {
      requireResolved(resolved.sessions, sessionId, "sessionId");
    }

    const lead = await this.users.createLead(studioId, {
      name,
      phone,
      ageRange,
      sessionId,
    });
    resolved.people.add(lead.id);
    if (lead.trialBooking) {
      resolved.bookings.add(lead.trialBooking.id);
      if (lead.trialBooking.sessionId) {
        resolved.sessions.add(lead.trialBooking.sessionId);
      }
    }

    return {
      content: JSON.stringify({
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        section: lead.section,
        trialBooking: lead.trialBooking,
      }),
      action: {
        tool: "create_lead",
        ok: true,
        summary: `Created lead ${lead.name}`,
      },
    };
  }

  private async createStudent(
    studioId: string,
    args: Record<string, unknown>,
    resolved: ResolvedIds,
  ): Promise<ToolExecutionResult> {
    const name = requireString(args, "name");
    const email = requireString(args, "email");
    const gender = requireGender(args);
    const age = requireAgeNumber(args);
    const phone =
      typeof args.phone === "string" && args.phone.trim()
        ? args.phone.trim()
        : undefined;

    const created = await this.users.createStudent({
      studioId,
      name,
      email,
      gender,
      age,
      phone,
    });
    const id = String((created as { id?: string }).id ?? "");
    if (id) {
      resolved.people.add(id);
    }

    return {
      content: JSON.stringify({
        id,
        name: (created as { name?: string }).name,
        email: (created as { email?: string }).email,
        temporaryPassword: (created as { temporaryPassword?: string })
          .temporaryPassword,
        setupHint: (created as { setupHint?: string }).setupHint,
      }),
      action: {
        tool: "create_student",
        ok: true,
        summary: `Created student ${name}`,
      },
    };
  }

  private async addRemark(
    studioId: string,
    actor: DecryptedUser,
    args: Record<string, unknown>,
    resolved: ResolvedIds,
  ): Promise<ToolExecutionResult> {
    const studentId = requireString(args, "studentId");
    const body = requireString(args, "body");
    requireResolved(resolved.people, studentId, "studentId");
    if (body.length > 2000) {
      throw new BadRequestException(
        "Remark body must be 2000 characters or fewer",
      );
    }

    const remark = await this.users.addLeadRemark(
      studioId,
      studentId,
      actor.id,
      body,
    );
    return {
      content: JSON.stringify(remark),
      action: {
        tool: "add_remark",
        ok: true,
        summary: "Added remark",
      },
    };
  }

  private async bookTrial(
    studioId: string,
    args: Record<string, unknown>,
    resolved: ResolvedIds,
  ): Promise<ToolExecutionResult> {
    const studentId = requireString(args, "studentId");
    const sessionId = requireString(args, "sessionId");
    requireResolved(resolved.people, studentId, "studentId");
    requireResolved(resolved.sessions, sessionId, "sessionId");

    const booking = await this.bookings.create({
      studioId,
      studentId,
      type: BookingType.TRIAL,
      sessionId,
    });
    const bookingId = String((booking as { id?: string }).id ?? "");
    if (bookingId) {
      resolved.bookings.add(bookingId);
    }

    return {
      content: JSON.stringify({
        id: bookingId,
        status: (booking as { status?: string }).status,
        sessionId,
        studentId,
      }),
      action: {
        tool: "book_trial",
        ok: true,
        summary: "Booked trial",
      },
    };
  }

  private async switchTrial(
    args: Record<string, unknown>,
    resolved: ResolvedIds,
  ): Promise<ToolExecutionResult> {
    const bookingId = requireString(args, "bookingId");
    const sessionId = requireString(args, "sessionId");
    requireResolved(resolved.bookings, bookingId, "bookingId");
    requireResolved(resolved.sessions, sessionId, "sessionId");

    const updated = await this.bookings.updateStatus(bookingId, {
      status: BookingStatus.PENDING,
      sessionId,
    });
    return {
      content: JSON.stringify({
        id: (updated as { id?: string }).id,
        status: (updated as { status?: string }).status,
        sessionId,
      }),
      action: {
        tool: "switch_trial",
        ok: true,
        summary: "Switched trial session",
      },
    };
  }

  private async confirmTrial(
    args: Record<string, unknown>,
    resolved: ResolvedIds,
  ): Promise<ToolExecutionResult> {
    const bookingId = requireString(args, "bookingId");
    requireResolved(resolved.bookings, bookingId, "bookingId");

    const updated = await this.bookings.updateStatus(bookingId, {
      status: BookingStatus.CONFIRMED,
    });
    return {
      content: JSON.stringify({
        id: (updated as { id?: string }).id,
        status: (updated as { status?: string }).status,
      }),
      action: {
        tool: "confirm_trial",
        ok: true,
        summary: "Confirmed trial",
      },
    };
  }

  private async setActive(
    studioId: string,
    args: Record<string, unknown>,
    resolved: ResolvedIds,
  ): Promise<ToolExecutionResult> {
    const studentId = requireString(args, "studentId");
    const active = requireBoolean(args, "active");
    const confirm = args.confirm === true;
    if (!confirm) {
      throw new BadRequestException(
        "set_active requires confirm=true after staff confirmation",
      );
    }
    requireResolved(resolved.people, studentId, "studentId");

    await this.users.updateStudioStudent(studioId, studentId, { active });
    return {
      content: JSON.stringify({ studentId, active }),
      action: {
        tool: "set_active",
        ok: true,
        summary: active ? "Unarchived student" : "Archived student",
      },
    };
  }

  private async switchBatch(
    studioId: string,
    args: Record<string, unknown>,
    resolved: ResolvedIds,
  ): Promise<ToolExecutionResult> {
    const studentId = requireString(args, "studentId");
    const toBatchId = requireString(args, "toBatchId");
    const confirm = args.confirm === true;
    if (!confirm) {
      throw new BadRequestException(
        "switch_batch requires confirm=true after staff confirmation",
      );
    }
    requireResolved(resolved.people, studentId, "studentId");
    requireResolved(resolved.batches, toBatchId, "toBatchId");

    let fromBatchId =
      typeof args.fromBatchId === "string" && args.fromBatchId.trim()
        ? args.fromBatchId.trim()
        : undefined;
    if (fromBatchId) {
      requireResolved(resolved.batches, fromBatchId, "fromBatchId");
    } else {
      const profile = await this.users.getStudentStudioProfile(
        studioId,
        studentId,
      );
      const active = (
        profile.batches as Array<{ id: string; enrollmentStatus: string }>
      ).find((b) => b.enrollmentStatus === "ACTIVE");
      if (!active) {
        throw new BadRequestException(
          "Student has no active batch enrollment; provide fromBatchId",
        );
      }
      fromBatchId = active.id;
      resolved.batches.add(fromBatchId);
    }

    const endNote =
      typeof args.endNote === "string" ? args.endNote.trim() : undefined;
    const moved = await this.batchCommands.switchBatch(
      fromBatchId,
      studentId,
      toBatchId,
      { endNote },
    );

    return {
      content: JSON.stringify({
        studentId,
        fromBatchId,
        toBatchId,
        enrollmentId: (moved as { id?: string }).id,
      }),
      action: {
        tool: "switch_batch",
        ok: true,
        summary: `Moved student to batch ${toBatchId}`,
      },
    };
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function requireString(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new BadRequestException(`${key} is required`);
  }
  return value.trim();
}

function requireBoolean(args: Record<string, unknown>, key: string): boolean {
  const value = args[key];
  if (typeof value !== "boolean") {
    throw new BadRequestException(`${key} must be a boolean`);
  }
  return value;
}

function parseAge(args: Record<string, unknown>): number {
  const raw = args.age;
  const value =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && raw.trim()
        ? Number(raw.trim())
        : Number.NaN;
  if (!isImportAge(value)) {
    throw new BadRequestException("age must be an integer between 0 and 120");
  }
  return value;
}

function requireAge(args: Record<string, unknown>): AgeRange {
  return ageRangeFromAge(parseAge(args));
}

function requireAgeNumber(args: Record<string, unknown>): number {
  return parseAge(args);
}

function requireGender(args: Record<string, unknown>): Gender {
  const value = requireString(args, "gender");
  if (!GENDERS.has(value)) {
    throw new BadRequestException(`Invalid gender: ${value}`);
  }
  return value as Gender;
}

export function requireResolved(
  set: Set<string>,
  id: string,
  label: string,
): void {
  if (!set.has(id)) {
    throw new BadRequestException(
      `${label} “${id}” was not resolved in this turn — search or list first`,
    );
  }
}

export function parseToolArguments(raw: string): unknown {
  try {
    return JSON.parse(raw || "{}") as unknown;
  } catch {
    throw new BadRequestException("Tool arguments must be valid JSON");
  }
}
