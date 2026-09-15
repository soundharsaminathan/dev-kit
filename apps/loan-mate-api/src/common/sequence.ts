import type { PrismaClient } from "../generated/prisma";

/** Atomically increment a named sequence and return the new value. */
export async function nextSequence(
  prisma: Pick<PrismaClient, "$transaction" | "sequence"> | PrismaClient,
  name: string,
): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const row = await tx.sequence.upsert({
      where: { name },
      create: { name, value: 1 },
      update: { value: { increment: 1 } },
    });
    return row.value;
  });
}

export function padSeq(n: number, width = 6): string {
  return String(n).padStart(width, "0");
}
