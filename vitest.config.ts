import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

// Vitest config with two projects:
//  - "node":   service/integration tests (existing) — node env, real DB
//  - "jsdom":  React component tests (new) — jsdom env for DOM APIs + RTL
// Both share the same setup file (jest-dom registration is no-op outside jsdom).

const sharedAlias = {
  "next-auth/react": path.resolve(
    __dirname,
    "__tests__/mocks/next-auth-react.ts"
  ),
  "next-auth": path.resolve(__dirname, "__tests__/mocks/next-auth.ts"),
  "next/navigation": path.resolve(
    __dirname,
    "__tests__/mocks/next-navigation.ts"
  ),
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    setupFiles: ["__tests__/setup.ts"],
    fileParallelism: false,
    testTimeout: 15000,
    alias: sharedAlias,
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: [
            "__tests__/unit/**/*.test.{ts,tsx}",
            "__tests__/integration/**/*.test.{ts,tsx}",
          ],
          exclude: ["__tests__/unit/components/**", "__tests__/components/**"],
        },
      },
      {
        extends: true,
        test: {
          name: "jsdom",
          environment: "jsdom",
          include: [
            "__tests__/components/**/*.test.{ts,tsx}",
            "__tests__/unit/components/**/*.test.{ts,tsx}",
          ],
        },
      },
    ],
  },
});
