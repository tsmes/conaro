// Playwright tests run against the local Next.js app and the project's
// test database. Force NODE_ENV=test before any import that touches env
// so `@next/env` (used by the runner) reads the test env file,
// mirroring `scripts/migrate.ts:18-20`.
Object.assign(process.env, { NODE_ENV: "test" });

import { loadEnvConfig } from "@next/env";

// Populate process.env from the test env files (.env.test, .env.test.local,
// .env). The webServer subprocess inherits this resolved env via
// `webServer.env` below — necessary because Playwright's `env:` REPLACES
// the child's process.env (no inheritance), and because `next dev` flips
// NODE_ENV back to "development" inside the spawned app, which would
// otherwise make @next/env in the child re-read .env.local and connect
// to the dev DB. Per Next.js env precedence, values already in
// process.env (from the spawn) win over .env files inside the child.
loadEnvConfig(process.cwd());

import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "__tests__/e2e",
  testMatch: "**/*.test.ts",
  globalSetup: "./__tests__/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      ...(process.env as Record<string, string>),
      NODE_ENV: "test",
    },
  },
});
