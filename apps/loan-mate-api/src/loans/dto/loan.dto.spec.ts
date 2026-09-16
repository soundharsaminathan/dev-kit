import "reflect-metadata";
import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { CreateLoanDto } from "./loan.dto";

const pipe = new ValidationPipe({
  whitelist: true,
  transform: true,
  forbidNonWhitelisted: true,
});

/** Payload posted by the New loan form. */
const createLoanBody = {
  customerId: "cust_1",
  productId: "prod_1",
  branchId: "branch_1",
  principal: 50_000,
  annualRatePercent: 18,
  tenureInstallments: 12,
  frequency: "MONTHLY",
  monthlyFirstEmiOption: "EXACT_DAY",
};

type BodyMetatype = new (...args: never[]) => object;

async function transformBody(payload: unknown, metatype: BodyMetatype) {
  return pipe.transform(payload, { type: "body", metatype });
}

function validationMessage(error: unknown): string {
  if (!(error instanceof BadRequestException)) {
    return error instanceof Error ? error.message : String(error);
  }
  const response = error.getResponse();
  if (typeof response === "string") return response;
  if (typeof response === "object" && response && "message" in response) {
    const message = (response as { message: unknown }).message;
    return Array.isArray(message) ? message.join(", ") : String(message);
  }
  return error.message;
}

describe("CreateLoanDto ValidationPipe", () => {
  it("accepts the new-loan form payload", async () => {
    const result = await transformBody(createLoanBody, CreateLoanDto);
    expect(result).toMatchObject(createLoanBody);
  });

  it("rejects unknown fields", async () => {
    await expect(
      transformBody({ ...createLoanBody, extraField: true }, CreateLoanDto),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects a missing customerId", async () => {
    const { customerId: _, ...withoutCustomer } = createLoanBody;
    await expect(transformBody(withoutCustomer, CreateLoanDto)).rejects.toThrow(
      BadRequestException,
    );
  });

  it("rejects every field when the DTO class is erased to Function", async () => {
    try {
      await transformBody(createLoanBody, Function as unknown as BodyMetatype);
      throw new Error("expected ValidationPipe to reject Function metatype");
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const message = validationMessage(error);
      expect(message).toContain("customerId should not exist");
      expect(message).toContain("productId should not exist");
      expect(message).toContain("principal should not exist");
    }
  });
});
