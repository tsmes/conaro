// CLI entry for `db:migrate` / `db:migrate:test`. The migration logic
// itself lives in scripts/lib/migrate.ts so the Playwright globalSetup
// (__tests__/e2e/global-setup.ts) can reuse it without spawning a child
// process.
//
// Pass --test to run against the test database. NODE_ENV must be flipped
// before runMigrations() (and the loadEnvConfig inside it) so @next/env
// picks the test env file. Object.assign avoids the readonly NODE_ENV
// constraint that @types/node + Next's augmentation impose.
import { runMigrations } from "./lib/migrate";

if (process.argv.includes("--test")) {
  Object.assign(process.env, { NODE_ENV: "test" });
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
