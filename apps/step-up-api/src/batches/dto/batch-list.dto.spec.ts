import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { BatchRosterQueryDto } from "./batch-list.dto";

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
