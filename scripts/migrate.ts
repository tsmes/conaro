// Apply Drizzle migrations against the database identified by DATABASE_URL.
//
// Used both as Railway's pre-deploy command (`npm run db:migrate`, env from
// platform) and locally (env loaded by @next/env from .env*). Pass --test to
// run against the test database instead of the dev one.
//
// Programmatic migrator (vs. drizzle-kit CLI) so it runs on production deps
// only — no devDep on drizzle-kit at deploy time.
import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

// Must flip NODE_ENV before loadEnvConfig so it picks the test env file
// instead of the dev one.
if (process.argv.includes("--test")) {
  process.env.NODE_ENV = "test";
}

loadEnvConfig(process.cwd());

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Aborting migration.");
    process.exit(1);
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

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
