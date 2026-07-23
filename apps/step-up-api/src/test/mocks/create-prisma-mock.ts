import { vi } from "vitest";

export function createPrismaMock(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    session: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    attendance: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    batch: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    booking: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    membership: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    notification: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    parentChild: {
      findUnique: vi.fn(),
    },
    conversationMember: {
      findMany: vi.fn(),
    },
    message: {
      count: vi.fn(),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn({})),
    $queryRaw: vi.fn(),
    ...overrides,
  };
}
