// Global test setup

// Vitest sets NODE_ENV=test before this file runs. loadEnvConfig then loads
// .env.test (and intentionally skips .env.local) so tests are deterministic
// regardless of any developer shell env. process.env still wins, so CI can
// override individual values.
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

// jest-dom registers matchers like toBeInTheDocument(), toHaveClass(), etc.
// Safe to import in both node and jsdom envs — it no-ops without a DOM.
import "@testing-library/jest-dom/vitest";

// jsdom doesn't ship with matchMedia, which several shadcn primitives need
// (Sidebar's use-mobile hook, theme toggles, etc.). Stub it with a
// never-matches implementation so components render without throwing.
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
