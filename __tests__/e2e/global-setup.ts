// Playwright globalSetup: applies Drizzle migrations against the test
// database before the suite starts, so tests can rely on a current schema
// without any developer pre-step. NODE_ENV=test is set at the top of
// playwright.config.ts and inherited by this hook; we re-assert it
// defensively to fail loudly if anything ever changes that ordering.
import { runMigrations } from "../../scripts/lib/migrate";

export default async function globalSetup(): Promise<void> {
  if (process.env.NODE_ENV !== "test") {
    throw new Error(
      "playwright globalSetup expects NODE_ENV=test (set by playwright.config.ts)"
    );
  }
  await runMigrations();
}
