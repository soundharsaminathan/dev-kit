import path from "node:path";
import "dotenv/config";
import { defineConfig } from "prisma/config";

function datasourceUrl(): string {
  return (
    process.env.DIRECT_DATABASE_URL ||
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@127.0.0.1:5432/postgres"
  );
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: datasourceUrl(),
  },
});
