// Global test setup

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
