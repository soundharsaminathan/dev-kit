import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { withDatabaseConnectTimeout } from "./db-retry";

const CONNECT_TIMEOUT_SECONDS = 30;

export function createPrismaAdapter(connectionString?: string) {
  const url = withDatabaseConnectTimeout(
    connectionString ?? process.env.DATABASE_URL,
    CONNECT_TIMEOUT_SECONDS,
  );
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
