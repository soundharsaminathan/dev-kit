import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { BatchAttendanceQueryDto, BatchRosterQueryDto } from "./batch-list.dto";

const pipe = new ValidationPipe({
  whitelist: true,
  transform: true,
  forbidNonWhitelisted: true,
});

describe("BatchRosterQueryDto", () => {
  it("allows tab and limit for roster queries", async () => {
    const result = await pipe.transform(
      { tab: "active", limit: "50" },
      { type: "query", metatype: BatchRosterQueryDto },
    );
    expect(result).toMatchObject({ tab: "active", limit: 50 });
  });

  it("rejects unknown roster query params", async () => {
    await expect(
      pipe.transform(
        { tab: "active", extra: "nope" },
        { type: "query", metatype: BatchRosterQueryDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("BatchAttendanceQueryDto", () => {
  it("allows a YYYY-MM month", async () => {
    const result = await pipe.transform(
      { month: "2026-08" },
      { type: "query", metatype: BatchAttendanceQueryDto },
    );
    expect(result).toMatchObject({ month: "2026-08" });
  });

  it("allows an empty query (defaults server-side)", async () => {
    const result = await pipe.transform(
      {},
      { type: "query", metatype: BatchAttendanceQueryDto },
    );
    expect(result).toEqual({});
  });

  it("rejects invalid month values", async () => {
    await expect(
      pipe.transform(
        { month: "2026-13" },
        { type: "query", metatype: BatchAttendanceQueryDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
