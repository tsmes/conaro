import { vi } from "vitest";

export class AuthError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "AuthError";
  }
}

export const signIn = vi.fn();
export const signOut = vi.fn();
export default vi.fn();
