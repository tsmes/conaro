import { vi } from "vitest";

export default vi.fn(() => ({
  id: "credentials",
  type: "credentials",
  authorize: vi.fn(),
}));
