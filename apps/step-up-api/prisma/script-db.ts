import { PrismaClient } from "@prisma/client";
import {
  withDatabaseConnectTimeout,
  withDbRetry,
} from "../src/prisma/db-retry";

/**
 * Shared helpers for one-shot Prisma scripts that talk to remote Neon.
 * Neon / runner blips routinely exceed Prisma's 5s default connect window.
 */

export function createScriptPrismaClient(): PrismaClient {
  return new PrismaClient({
    datasources: {
      db: {
        url: withDatabaseConnectTimeout(process.env.DATABASE_URL, 30),
      },
    },
  });
}

export { withDbRetry } from "../src/prisma/db-retry";
