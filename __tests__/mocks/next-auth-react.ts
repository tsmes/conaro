import { vi } from "vitest";

// Client-side next-auth surface used by logout buttons, avatar menus, etc.
// The real module requires browser APIs we don't exercise in unit tests;
// these stubs just let the imports resolve.
export const signIn = vi.fn();
export const signOut = vi.fn();
export const useSession = vi.fn(() => ({ data: null, status: "unauthenticated" }));
export const SessionProvider = ({ children }: { children: React.ReactNode }) => children;
