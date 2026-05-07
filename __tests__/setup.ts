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

// jsdom doesn't ship with ResizeObserver, but several components depend on
// it (e.g. react-photo-album measures its container width). Stub it as a
// no-op so render() doesn't throw and SSR/default-width fallbacks kick in.
if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver;
}

// jsdom always reports `clientWidth: 0`. react-photo-album reads it once
// the container ref is attached and discards `defaultContainerWidth`,
// leaving the album with width=0 and rendering nothing. Forcing a non-
// zero default lets the layout compute photo cells in tests.
if (typeof HTMLElement !== "undefined") {
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "clientWidth"
  );
  if (!descriptor || descriptor.configurable !== false) {
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get() {
        return 800;
      },
    });
  }
}
