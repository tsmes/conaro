// Playwright tests run against the local Next.js app and the project's
// test database. Force NODE_ENV=test before any import that touches env
// so `@next/env` (loaded by `webServer` and any test imports) reads the
// `.env.test` file, mirroring `scripts/migrate.ts:18-20`.
Object.assign(process.env, { NODE_ENV: "test" });

import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "__tests__/e2e",
  testMatch: "**/*.test.ts",
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
      NODE_ENV: "test",
    },
  },
});
