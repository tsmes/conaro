// Apply Drizzle migrations against the database identified by DATABASE_URL.
//
// Programmatic migrator (vs. drizzle-kit CLI) so it runs on production deps
// only — no devDep on drizzle-kit at deploy time. Loaded by both the
// `db:migrate` CLI (scripts/migrate.ts) and the Playwright globalSetup
// (__tests__/e2e/global-setup.ts).
//
// Caller is responsible for setting NODE_ENV (e.g. to "test") *before*
// invoking runMigrations() — loadEnvConfig picks the env file based on
// NODE_ENV, and Object.assign is needed to bypass the readonly NODE_ENV
// constraint imposed by @types/node + Next's augmentation.
import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

export async function runMigrations(): Promise<void> {
  loadEnvConfig(process.cwd());

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Aborting migration.");
  }

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);

  console.log(
    `Applying migrations${
      process.env.NODE_ENV === "test" ? " (test)" : ""
    }…`
  );
  try {
    await migrate(db, { migrationsFolder: "./src/lib/db/migrations" });
    console.log("Migrations applied.");
  } finally {
    await pool.end();
  }
}
