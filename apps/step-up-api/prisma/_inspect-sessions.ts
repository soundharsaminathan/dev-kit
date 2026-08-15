import { PrismaClient } from "@prisma/client";

async function main() {
  const p = new PrismaClient();
  const rows = await p.session.findMany({
    where: {
      batch: { studioId: "studio-e2e-1" },
      startsAt: {
        gte: new Date("2026-10-01T00:00:00Z"),
        lt: new Date("2026-11-01T00:00:00Z"),
      },
    },
    select: { id: true, startsAt: true, status: true, batchId: true },
    orderBy: { startsAt: "asc" },
  });
  console.table(
    rows.map((r) => ({
      id: r.id,
      startsAt: r.startsAt.toISOString(),
      status: r.status,
      batchId: r.batchId,
    })),
  );
  await p.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
