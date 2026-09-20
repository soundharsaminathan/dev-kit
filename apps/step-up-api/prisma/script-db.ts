import type { PrismaClient } from "../src/generated/prisma/client";
import { createPrismaClient } from "../src/prisma/create-prisma-client";

/**
 * Shared helpers for one-shot Prisma scripts that talk to remote Neon.
 * Neon / runner blips routinely exceed Prisma's 5s default connect window.
 */

export function createScriptPrismaClient(): PrismaClient {
  return createPrismaClient();
}

export { withDbRetry } from "../src/prisma/db-retry";
