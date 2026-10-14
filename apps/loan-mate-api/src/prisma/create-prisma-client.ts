import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

export function createPrismaAdapter(connectionString?: string) {
  const url = connectionString ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }
  return new PrismaPg({
    connectionString: url,
  });
}

export function createPrismaClient() {
  return new PrismaClient({
    adapter: createPrismaAdapter(),
  });
}
