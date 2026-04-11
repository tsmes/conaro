import { vi } from "vitest";

export const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});

export const useRouter = vi.fn();
export const usePathname = vi.fn();
export const useSearchParams = vi.fn();
