import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["__tests__/**/*.test.{ts,tsx}"],
    setupFiles: ["__tests__/setup.ts"],
    fileParallelism: false,
    testTimeout: 15000,
    alias: {
      "next-auth": path.resolve(__dirname, "__tests__/mocks/next-auth.ts"),
      "next/navigation": path.resolve(
        __dirname,
        "__tests__/mocks/next-navigation.ts"
      ),
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
