import { Client } from "pg";

const DATABASE_NAME = "loan_mate_e2e";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to prepare the e2e database");
  }

  const admin = new URL(databaseUrl);
  admin.pathname = "/postgres";
  admin.search = "";

  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    const existing = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [DATABASE_NAME],
    );
    if (existing.rowCount === 0) {
      await client.query(`CREATE DATABASE ${DATABASE_NAME}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
